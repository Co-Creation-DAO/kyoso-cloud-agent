import { Test, TestingModule } from '@nestjs/testing';
import { IssueToHolderConnectionProcessor } from './issue-to-holder-connection.processor';
import { ConfigModule } from '@nestjs/config';
import identusConfig from '../../../../config/identus.config';
import { VcConnectionService } from '../vc.connection.service';
import { DidService } from '../../../did/did.service';
import { ConnectionService } from '../../../connection/connection.service';
import { Job } from 'bullmq';
import { IdentusApiMock } from '../../../../../test/mocks';
import { DIDStatus } from '../../../did/dto/identus/did-status.dto';
import { VCProtocolState } from '../../dto/identus';
import { ConnectionProtocolState } from '../../../connection/dto/identus/connection.dto';
import type { IssueCredentialRecordDto } from '../../dto/identus';

describe('IssueToHolderConnectionProcessor', () => {
  let processor: IssueToHolderConnectionProcessor;
  let vcConnectionService: jest.Mocked<VcConnectionService>;
  let didService: jest.Mocked<DidService>;
  let connectionService: jest.Mocked<ConnectionService>;
  let mockJob: jest.Mocked<Job>;

  const mockJobData = {
    claims: { name: 'Test User', age: 30 },
    holderApiKey: 'holder-api-key',
  };

  const mockIssuerDid = {
    did: 'did:prism:issuer123',
    status: DIDStatus.PUBLISHED,
  };

  const mockHolderDid = {
    did: 'did:prism:holder123',
    status: DIDStatus.PUBLISHED,
  };

  const mockConnectionResponse = {
    connectionId: 'test-connection-id-1',
    invitation: {
      invitationUrl: 'https://my.domain.com/path?_oob=test-oob-code-123',
    },
  };

  const mockIssuerRecord: IssueCredentialRecordDto = {
    recordId: 'issuer-record-1',
    thid: 'test-thread-vc-1',
    role: 'Issuer',
    subjectId: 'did:prism:issuer123',
    protocolState: VCProtocolState.OFFER_SENT,
    credentialFormat: 'AnonCreds',
    createdAt: '2024-01-01T10:10:00Z',
    updatedAt: '2024-01-01T10:10:00Z',
    metaRetries: 0,
    metaLastFailure: null,
  };

  const mockHolderRecord: IssueCredentialRecordDto = {
    recordId: 'holder-record-1',
    thid: 'test-thread-vc-1',
    role: 'Holder',
    subjectId: 'did:prism:holder123',
    protocolState: VCProtocolState.CREDENTIAL_RECEIVED,
    credentialFormat: 'AnonCreds',
    createdAt: '2024-01-01T10:15:00Z',
    updatedAt: '2024-01-01T10:15:00Z',
    metaRetries: 0,
    metaLastFailure: null,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    IdentusApiMock.clearMocks();

    process.env.KYOSO_ISSUER_API_KEY = 'test-issuer-key';

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [identusConfig],
        }),
      ],
      providers: [
        IssueToHolderConnectionProcessor,
        {
          provide: VcConnectionService,
          useValue: {
            issuerCreateVcOffer: jest.fn(),
            findAll: jest.fn(),
            holderAcceptOffer: jest.fn(),
            waitForState: jest.fn(),
            findOneByRecordId: jest.fn(),
          },
        },
        {
          provide: DidService,
          useValue: {
            getIssuerDid: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: ConnectionService,
          useValue: {
            create: jest.fn(),
            acceptInvitation: jest.fn(),
            getConnectionById: jest.fn(),
          },
        },
      ],
    }).compile();

    processor = module.get<IssueToHolderConnectionProcessor>(
      IssueToHolderConnectionProcessor,
    );
    vcConnectionService = module.get(VcConnectionService);
    didService = module.get(DidService);
    connectionService = module.get(ConnectionService);

    mockJob = {
      id: 'test-job-1',
      data: mockJobData,
      updateProgress: jest.fn().mockResolvedValue(undefined),
    } as any;
  });

  describe('process', () => {
    it('should successfully complete the full issue-to-holder flow', async () => {
      jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return {} as any;
      });

      didService.getIssuerDid.mockResolvedValue(mockIssuerDid);
      didService.findOne.mockResolvedValue(mockHolderDid);
      connectionService.create.mockResolvedValue(mockConnectionResponse);
      connectionService.acceptInvitation.mockResolvedValue({
        connectionId: 'holder-connection-id',
      });
      connectionService.getConnectionById.mockResolvedValue({
        state: ConnectionProtocolState.CONNECTION_RESPONSE_SENT,
      });
      vcConnectionService.issuerCreateVcOffer.mockResolvedValue(
        mockIssuerRecord,
      );
      vcConnectionService.findAll.mockResolvedValueOnce({
        contents: [
          {
            recordId: 'holder-record-1',
            thid: 'test-thread-vc-1',
            protocolState: VCProtocolState.OFFER_RECEIVED,
          },
        ],
      });
      vcConnectionService.holderAcceptOffer.mockResolvedValue(mockHolderRecord);
      vcConnectionService.waitForState.mockResolvedValue(mockHolderRecord);
      vcConnectionService.findOneByRecordId.mockResolvedValue(mockIssuerRecord);

      const result = await processor.process(mockJob);

      expect(result).toEqual(mockHolderRecord);
      expect(mockJob.updateProgress).toHaveBeenCalledTimes(12);
      expect(didService.getIssuerDid).toHaveBeenCalled();
      expect(didService.findOne).toHaveBeenCalledWith('holder-api-key');
    }, 10000);

    it('should throw error when issuer DID is not found', async () => {
      didService.getIssuerDid.mockResolvedValue(null);

      await expect(processor.process(mockJob)).rejects.toThrow(
        'Issuer DID not found or not published',
      );

      expect(mockJob.updateProgress).toHaveBeenCalledWith(0);
    });

    it('should throw error when issuer DID is not published', async () => {
      didService.getIssuerDid.mockResolvedValue({
        did: 'did:prism:issuer123',
        status: DIDStatus.CREATED,
      });

      await expect(processor.process(mockJob)).rejects.toThrow(
        'Issuer DID not found or not published',
      );
    });

    it('should throw error when holder DID is not found', async () => {
      didService.getIssuerDid.mockResolvedValue(mockIssuerDid);
      didService.findOne.mockResolvedValue(null);

      await expect(processor.process(mockJob)).rejects.toThrow(
        'Holder DID not found or not published',
      );
    });

    it('should throw error when holder DID is not published', async () => {
      didService.getIssuerDid.mockResolvedValue(mockIssuerDid);
      didService.findOne.mockResolvedValue({
        did: 'did:prism:holder123',
        status: DIDStatus.CREATED,
      });

      await expect(processor.process(mockJob)).rejects.toThrow(
        'Holder DID not found or not published',
      );
    });

    it('should throw error when connection invitation URL is missing', async () => {
      didService.getIssuerDid.mockResolvedValue(mockIssuerDid);
      didService.findOne.mockResolvedValue(mockHolderDid);
      connectionService.create.mockResolvedValue({
        connectionId: 'test-connection-id-1',
        invitation: undefined,
      });

      await expect(processor.process(mockJob)).rejects.toThrow(
        'Connection invitation URL missing',
      );
    });

    it('should throw error when connection establishment times out', async () => {
      didService.getIssuerDid.mockResolvedValue(mockIssuerDid);
      didService.findOne.mockResolvedValue(mockHolderDid);
      connectionService.create.mockResolvedValue(mockConnectionResponse);
      connectionService.acceptInvitation.mockResolvedValue({
        connectionId: 'holder-connection-id',
      });
      connectionService.getConnectionById.mockResolvedValue({
        state: 'InvitationGenerated',
      });

      jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return {} as any;
      });

      await expect(processor.process(mockJob)).rejects.toThrow(
        'Connection establishment timeout',
      );
    });

    it('should throw error when holder record in OfferReceived state is not found', async () => {
      didService.getIssuerDid.mockResolvedValue(mockIssuerDid);
      didService.findOne.mockResolvedValue(mockHolderDid);
      connectionService.create.mockResolvedValue(mockConnectionResponse);
      connectionService.acceptInvitation.mockResolvedValue({
        connectionId: 'holder-connection-id',
      });
      connectionService.getConnectionById.mockResolvedValue({
        state: ConnectionProtocolState.CONNECTION_RESPONSE_SENT,
      });
      vcConnectionService.issuerCreateVcOffer.mockResolvedValue(
        mockIssuerRecord,
      );
      vcConnectionService.findAll.mockResolvedValue({
        contents: [],
      });

      jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return {} as any;
      });

      await expect(processor.process(mockJob)).rejects.toThrow(
        'Holder record in OfferReceived state not found',
      );
    });

    it('should handle axios error correctly', async () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 404,
          data: {
            status: 404,
            type: '/errors/not-found',
            title: 'Not Found',
            detail: 'Resource not found',
          },
        },
        message: 'Request failed with status code 404',
        config: { url: '/test-endpoint' },
      };

      didService.getIssuerDid.mockRejectedValue(axiosError);

      await expect(processor.process(mockJob)).rejects.toThrow();
    });

    it('should handle generic error correctly', async () => {
      const genericError = new Error('Generic error message');
      didService.getIssuerDid.mockRejectedValue(genericError);

      await expect(processor.process(mockJob)).rejects.toThrow();
    });
  });

  describe('createErrorResponse', () => {
    it('should create axios error response', () => {
      const axiosError = new Error(
        'Request failed with status code 404',
      ) as any;
      axiosError.isAxiosError = true;
      axiosError.response = {
        status: 404,
        data: {
          status: 404,
          type: '/errors/not-found',
          title: 'Not Found',
          detail: 'Resource not found',
        },
      };
      axiosError.config = { url: '/test-endpoint' };

      const result = (processor as any).createErrorResponse(axiosError);

      expect(result).toEqual({
        status: 404,
        type: '/errors/not-found',
        title: 'Not Found',
        detail: 'Resource not found',
      });
    });

    it('should create axios error response without response data', () => {
      const axiosError = new Error('Network Error') as any;
      axiosError.isAxiosError = true;
      axiosError.response = { status: 500 };
      axiosError.config = { url: '/test-endpoint' };

      const result = (processor as any).createErrorResponse(axiosError);

      expect(result).toEqual({
        status: 500,
        type: '/errors/identus-api-error',
        title: 'Identus API Error',
        detail: 'Network Error',
        instance: '/test-endpoint',
      });
    });

    it('should create generic error response', () => {
      const genericError = new Error('Generic error message');

      const result = (processor as any).createErrorResponse(genericError);

      expect(result).toEqual({
        status: 500,
        type: '/errors/internal-server-error',
        title: 'Internal Server Error',
        detail: 'Generic error message',
      });
    });
  });

  describe('isAxiosError', () => {
    it('should return true for axios error', () => {
      const axiosError = new Error('test error') as any;
      axiosError.isAxiosError = true;

      const result = (processor as any).isAxiosError(axiosError);

      expect(result).toBe(true);
    });

    it('should return false for generic error', () => {
      const genericError = new Error('generic error');

      const result = (processor as any).isAxiosError(genericError);

      expect(result).toBe(false);
    });
  });

  describe('onCompleted', () => {
    it('should log completion message', () => {
      const logSpy = jest.spyOn((processor as any).logger, 'log');

      processor.onCompleted(mockJob);

      expect(logSpy).toHaveBeenCalledWith(
        'Job test-job-1 completed successfully',
      );
    });
  });

  describe('onFailed', () => {
    it('should log failure message', () => {
      const logSpy = jest.spyOn((processor as any).logger, 'error');
      const error = new Error('Test error');

      processor.onFailed(mockJob, error);

      expect(logSpy).toHaveBeenCalledWith(
        'Job test-job-1 failed with error: Test error',
      );
    });
  });
});
