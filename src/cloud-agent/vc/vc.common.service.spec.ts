import { Test, TestingModule } from '@nestjs/testing';
import { VcCommonService } from './vc.common.service';
import { ConfigModule } from '@nestjs/config';
import identusConfig from '../../config/identus.config';
import { DidService } from '../did/did.service';
import { HttpService } from '@nestjs/axios';
import { IdentusApiMock } from '../../../test/mocks';
import { VCProtocolState } from './dto/identus';
import { of, throwError } from 'rxjs';

describe('VcCommonService', () => {
  let service: VcCommonService;
  let httpService: HttpService;
  let didService: DidService;

  beforeEach(async () => {
    jest.clearAllMocks();
    IdentusApiMock.clearMocks();

    process.env.IDENTUS_CLOUD_AGENT_URL = 'http://localhost:8080';
    process.env.KYOSO_ISSUER_API_KEY = 'test-issuer-api-key';

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [identusConfig],
        }),
      ],
      providers: [
        VcCommonService,
        {
          provide: DidService,
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
            post: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<VcCommonService>(VcCommonService);
    httpService = module.get<HttpService>(HttpService);
    didService = module.get<DidService>(DidService);
  });

  describe('findAll', () => {
    it('should return VC records list', async () => {
      const apiKey = 'test-api-key';
      const mockData = IdentusApiMock.getFixture('vc-records-list');

      (httpService.get as jest.Mock).mockReturnValue(of({ data: mockData }));

      const result = await service.findAll(apiKey);

      expect(result).toBeDefined();
      expect(result.contents).toHaveLength(2);
      expect(result.contents[0].recordId).toBe('test-record-1');
      expect(result.contents[0].protocolState).toBe('OfferSent');
      expect(httpService.get).toHaveBeenCalledWith(
        'http://localhost:8080/issue-credentials/records',
        expect.objectContaining({
          headers: {
            apikey: apiKey,
            'Content-Type': 'application/json',
          },
        }),
      );
    });

    it('should handle API errors', async () => {
      const apiKey = 'test-api-key';

      (httpService.get as jest.Mock).mockReturnValue(
        throwError(() => new Error('Internal Server Error')),
      );

      await expect(service.findAll(apiKey)).rejects.toThrow(
        'Internal Server Error',
      );
    });

    it('should handle network errors', async () => {
      const apiKey = 'test-api-key';

      (httpService.get as jest.Mock).mockReturnValue(
        throwError(() => new Error('Network Error')),
      );

      await expect(service.findAll(apiKey)).rejects.toThrow('Network Error');
    });
  });

  describe('findOneByRecordId', () => {
    it('should return single VC record', async () => {
      const recordId = 'test-record-123';
      const apiKey = 'test-api-key';
      const mockData = IdentusApiMock.getFixture('vc-record-single');

      (httpService.get as jest.Mock).mockReturnValue(of({ data: mockData }));

      const result = await service.findOneByRecordId(recordId, apiKey);

      expect(result).toBeDefined();
      expect(result.recordId).toBe('test-record-123');
      expect(result.protocolState).toBe('OfferSent');
      expect(result.role).toBe('Issuer');
      expect(httpService.get).toHaveBeenCalledWith(
        `http://localhost:8080/issue-credentials/records/${recordId}`,
        expect.objectContaining({
          headers: {
            apikey: apiKey,
            'Content-Type': 'application/json',
          },
        }),
      );
    });

    it('should handle 404 errors', async () => {
      const recordId = 'non-existent-record';
      const apiKey = 'test-api-key';

      (httpService.get as jest.Mock).mockReturnValue(
        throwError(() => new Error('Request failed with status code 404')),
      );

      await expect(service.findOneByRecordId(recordId, apiKey)).rejects.toThrow(
        'Request failed with status code 404',
      );
    });

    it('should handle API errors', async () => {
      const recordId = 'test-record-123';
      const apiKey = 'test-api-key';

      (httpService.get as jest.Mock).mockReturnValue(
        throwError(() => new Error('Internal Server Error')),
      );

      await expect(service.findOneByRecordId(recordId, apiKey)).rejects.toThrow(
        'Internal Server Error',
      );
    });
  });

  describe('waitForState', () => {
    it('should return record when target state is reached immediately', async () => {
      const recordId = 'test-record-123';
      const targetState: VCProtocolState = 'CredentialReceived';
      const apiKey = 'test-api-key';

      const mockRecord = {
        ...IdentusApiMock.getFixture('vc-record-single'),
        protocolState: targetState,
      };

      (httpService.get as jest.Mock).mockReturnValue(of({ data: mockRecord }));

      const result = await service.waitForState(
        recordId,
        targetState,
        apiKey,
        5,
        100,
      );

      expect(result).toBeDefined();
      expect(result.protocolState).toBe(targetState);
      expect(httpService.get).toHaveBeenCalledTimes(1);
    });

    it('should poll and return when target state is reached after retries', async () => {
      const recordId = 'test-record-456';
      const targetState: VCProtocolState = 'CredentialReceived';
      const apiKey = 'test-api-key';

      const initialRecord = IdentusApiMock.getFixture('vc-record-single');
      const finalRecord = {
        ...initialRecord,
        protocolState: targetState,
      };

      (httpService.get as jest.Mock)
        .mockReturnValueOnce(of({ data: initialRecord }))
        .mockReturnValueOnce(of({ data: initialRecord }))
        .mockReturnValueOnce(of({ data: finalRecord }));

      const result = await service.waitForState(
        recordId,
        targetState,
        apiKey,
        5,
        100,
      );

      expect(result).toBeDefined();
      expect(result.protocolState).toBe(targetState);
      expect(httpService.get).toHaveBeenCalledTimes(3);
    });

    it('should timeout when target state is never reached', async () => {
      const recordId = 'test-record-timeout';
      const targetState: VCProtocolState = 'CredentialReceived';
      const apiKey = 'test-api-key';

      const mockRecord = IdentusApiMock.getFixture('vc-record-single');

      (httpService.get as jest.Mock).mockReturnValue(of({ data: mockRecord }));

      await expect(
        service.waitForState(recordId, targetState, apiKey, 3, 50),
      ).rejects.toThrow(
        `Timeout waiting for state ${targetState} on record ${recordId}`,
      );

      expect(httpService.get).toHaveBeenCalledTimes(3);
    });

    it('should handle API errors during polling', async () => {
      const recordId = 'test-record-error';
      const targetState: VCProtocolState = 'CredentialReceived';
      const apiKey = 'test-api-key';

      (httpService.get as jest.Mock).mockReturnValue(
        throwError(() => new Error('Internal Server Error')),
      );

      await expect(
        service.waitForState(recordId, targetState, apiKey, 2, 50),
      ).rejects.toThrow('Internal Server Error');
    });
  });

  describe('holderAcceptOffer', () => {
    it('should accept VC offer and return updated record', async () => {
      const recordId = 'test-record-789';
      const subjectId = 'did:prism:subject789';
      const apiKey = 'holder-api-key';
      const mockData = IdentusApiMock.getFixture('vc-holder-accept-response');

      (httpService.post as jest.Mock).mockReturnValue(of({ data: mockData }));

      const result = await service.holderAcceptOffer(
        recordId,
        subjectId,
        apiKey,
      );

      expect(result).toBeDefined();
      expect(result.recordId).toBe('test-record-789');
      expect(result.protocolState).toBe('RequestSent');
      expect(result.role).toBe('Holder');
      expect(httpService.post).toHaveBeenCalledWith(
        `http://localhost:8080/issue-credentials/records/${recordId}/accept-offer`,
        { subjectId },
        expect.objectContaining({
          headers: {
            apikey: apiKey,
            'Content-Type': 'application/json',
          },
        }),
      );
    });

    it('should handle validation errors', async () => {
      const recordId = 'invalid-record';
      const subjectId = 'invalid-subject';
      const apiKey = 'holder-api-key';

      (httpService.post as jest.Mock).mockReturnValue(
        throwError(() => new Error('Bad Request')),
      );

      await expect(
        service.holderAcceptOffer(recordId, subjectId, apiKey),
      ).rejects.toThrow('Bad Request');
    });

    it('should handle authorization errors', async () => {
      const recordId = 'test-record-789';
      const subjectId = 'did:prism:subject789';
      const apiKey = 'invalid-api-key';

      (httpService.post as jest.Mock).mockReturnValue(
        throwError(() => new Error('Unauthorized')),
      );

      await expect(
        service.holderAcceptOffer(recordId, subjectId, apiKey),
      ).rejects.toThrow('Unauthorized');
    });

    it('should handle network errors', async () => {
      const recordId = 'test-record-network';
      const subjectId = 'did:prism:subject';
      const apiKey = 'holder-api-key';

      (httpService.post as jest.Mock).mockReturnValue(
        throwError(() => new Error('Network Error')),
      );

      await expect(
        service.holderAcceptOffer(recordId, subjectId, apiKey),
      ).rejects.toThrow('Network Error');
    });
  });

  describe('issuerIssueCredential', () => {
    it('should issue credential and return updated record', async () => {
      const recordId = 'test-record-101';
      const mockData = IdentusApiMock.getFixture('vc-issuer-issue-response');

      (httpService.post as jest.Mock).mockReturnValue(of({ data: mockData }));

      const result = await service.issuerIssueCredential(recordId);

      expect(result).toBeDefined();
      expect(result.recordId).toBe('test-record-101');
      expect(result.protocolState).toBe('CredentialSent');
      expect(result.role).toBe('Issuer');
      expect(result.issuedCredentialRaw).toBeDefined();
      expect(httpService.post).toHaveBeenCalledWith(
        `http://localhost:8080/issue-credentials/records/${recordId}/issue-credential`,
        {},
        expect.objectContaining({
          headers: {
            apikey: 'test-issuer-api-key',
            'Content-Type': 'application/json',
          },
        }),
      );
    });

    it('should handle record not found errors', async () => {
      const recordId = 'non-existent-record';

      (httpService.post as jest.Mock).mockReturnValue(
        throwError(() => new Error('Record not found')),
      );

      await expect(service.issuerIssueCredential(recordId)).rejects.toThrow(
        'Record not found',
      );
    });

    it('should handle invalid state errors', async () => {
      const recordId = 'invalid-state-record';

      (httpService.post as jest.Mock).mockReturnValue(
        throwError(() => new Error('Invalid protocol state')),
      );

      await expect(service.issuerIssueCredential(recordId)).rejects.toThrow(
        'Invalid protocol state',
      );
    });

    it('should handle API errors', async () => {
      const recordId = 'test-record-error';

      (httpService.post as jest.Mock).mockReturnValue(
        throwError(() => new Error('Internal Server Error')),
      );

      await expect(service.issuerIssueCredential(recordId)).rejects.toThrow(
        'Internal Server Error',
      );
    });

    it('should handle network errors', async () => {
      const recordId = 'test-record-network';

      (httpService.post as jest.Mock).mockReturnValue(
        throwError(() => new Error('Network Error')),
      );

      await expect(service.issuerIssueCredential(recordId)).rejects.toThrow(
        'Network Error',
      );
    });
  });
});
