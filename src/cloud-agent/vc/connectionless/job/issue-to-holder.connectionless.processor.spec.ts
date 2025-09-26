import { Test, TestingModule } from '@nestjs/testing';
import { IssueToHolderProcessor } from './issue-to-holder.connectionless.processor';
import { VcConnectionlessService } from '../vc.connectionless.service';
import { DidService } from '../../../did/did.service';
import { identusConfig } from '../../../../config';
import { Job } from 'bullmq';
import { IdentusApiMock } from '../../../../../test/mocks';
import { DIDStatus } from '../../../did/dto/identus/did-status.dto';
import { VCProtocolState } from '../../dto/identus';
import type { IssueToHolderJobData } from './issue-to-holder.connectionless.processor';
import type { ErrorResponseDto } from '../../../../common/dto/error-response.dto';
import { AxiosError } from 'axios';

describe('IssueToHolderProcessor', () => {
  let processor: IssueToHolderProcessor;
  let vcConnectionlessService: VcConnectionlessService;
  let didService: DidService;
  let mockJob: jest.Mocked<Job<IssueToHolderJobData>>;

  beforeEach(async () => {
    jest.clearAllMocks();
    IdentusApiMock.clearMocks();

    mockJob = {
      id: 'test-job-123',
      data: {
        claims: { name: 'Test User', age: '25' },
        holderApiKey: 'test-holder-api-key',
      },
      updateProgress: jest.fn().mockResolvedValue(undefined),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IssueToHolderProcessor,
        {
          provide: identusConfig.KEY,
          useValue: {
            cloudAgentUrl: 'http://localhost:8080',
            issuerApiKey: 'test-issuer-api-key',
          },
        },
        {
          provide: VcConnectionlessService,
          useValue: {
            issuerCreateVcOffer: jest.fn(),
            holderAcceptInvitation: jest.fn(),
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
      ],
    }).compile();

    processor = module.get<IssueToHolderProcessor>(IssueToHolderProcessor);
    vcConnectionlessService = module.get<VcConnectionlessService>(VcConnectionlessService);
    didService = module.get<DidService>(DidService);
  });

  describe('process', () => {
    it('should successfully process complete VC issuance flow', async () => {
      // Setup mock data
      const issuerDid = {
        did: 'did:prism:issuer123',
        status: DIDStatus.PUBLISHED,
      };

      const holderDid = {
        did: 'did:prism:holder456',
        status: DIDStatus.PUBLISHED,
      };

      const issuerRecord = IdentusApiMock.getFixture('vc-connectionless-issuer-create-offer-with-url');
      const holderRecord = IdentusApiMock.getFixture('vc-connectionless-holder-accept');
      const finalHolderRecord = IdentusApiMock.getFixture('vc-record-credential-received');
      const finalIssuerRecord = IdentusApiMock.getFixture('vc-record-single');

      // Setup service mocks
      (didService.getIssuerDid as jest.Mock).mockResolvedValue(issuerDid);
      (didService.findOne as jest.Mock).mockResolvedValue(holderDid);
      (vcConnectionlessService.issuerCreateVcOffer as jest.Mock).mockResolvedValue(issuerRecord);
      (vcConnectionlessService.holderAcceptInvitation as jest.Mock).mockResolvedValue(holderRecord);
      (vcConnectionlessService.holderAcceptOffer as jest.Mock).mockResolvedValue(holderRecord);
      (vcConnectionlessService.waitForState as jest.Mock).mockResolvedValue(finalHolderRecord);
      (vcConnectionlessService.findOneByRecordId as jest.Mock).mockResolvedValue(finalIssuerRecord);

      const result = await processor.process(mockJob);

      expect(result).toEqual(finalHolderRecord);
      expect(mockJob.updateProgress).toHaveBeenCalledWith(0);
      expect(mockJob.updateProgress).toHaveBeenCalledWith(12.5);
      expect(mockJob.updateProgress).toHaveBeenCalledWith(25);
      expect(mockJob.updateProgress).toHaveBeenCalledWith(37.5);
      expect(mockJob.updateProgress).toHaveBeenCalledWith(50);
      expect(mockJob.updateProgress).toHaveBeenCalledWith(62.5);
      expect(mockJob.updateProgress).toHaveBeenCalledWith(87.5);
      expect(mockJob.updateProgress).toHaveBeenCalledWith(100);

      expect(didService.getIssuerDid).toHaveBeenCalledTimes(1);
      expect(didService.findOne).toHaveBeenCalledWith('test-holder-api-key');
      expect(vcConnectionlessService.issuerCreateVcOffer).toHaveBeenCalledWith({
        name: 'Test User',
        age: '25',
      });
      expect(vcConnectionlessService.holderAcceptInvitation).toHaveBeenCalledWith(
        'eyJAdHlwZSI6Imh0dHBzOi8vZGlkY29tbS5vcmcvb3V0LW9mLWJhbmQvMi4wL2ludml0YXRpb24iLCJAaWQiOiIxMjM0NTY3OCIsImxhYmVsIjoiVkMgT2ZmZXIiLCJnb2FsX2NvZGUiOiJpc3N1ZS12YyIsImFjY2VwdCI6WyJkaWRjb21tL3YyIl0sInNlcnZpY2VzIjpbeyJpZCI6IiNpbmxpbmUtMCIsInR5cGUiOiJkaWQtY29tbXVuaWNhdGlvbiIsInNlcnZpY2VFbmRwb2ludCI6Imh0dHBzOi8vYWdlbnQuZXhhbXBsZS5jb20vZGlkY29tbSIsImFjY2VwdCI6WyJkaWRjb21tL3YyIl0sInJlY2lwaWVudEtleXMiOlsiZGlkOmtleTp6NkFhZjZBNTNEZlJrYUhvSzNFNThyeXhRdGFUaXhtdjdTSjNwYWlaaGNBM0t6NDdGZzNBRzJoUm83UEJrTGN6ayJdfV0sInJlcXVlc3RzflnttGFjaCI6W3siaWQiOiJjcmVkZW50aWFsLW9mZmVyLTEyMyIsInR5cGUiOiJjcmVkZW50aWFsLW9mZmVyIiwibWV0aG9kIjoiaXNzdWVkIiwibGFiZWwiOiJJc3N1ZWQgQ3JlZGVudGlhbCJ9XX0=',
        'test-holder-api-key',
      );
      expect(vcConnectionlessService.holderAcceptOffer).toHaveBeenCalledWith(
        'vc-accept-record-456',
        'did:prism:holder456',
        'test-holder-api-key',
      );
      expect(vcConnectionlessService.waitForState).toHaveBeenCalledWith(
        'vc-accept-record-456',
        VCProtocolState.CREDENTIAL_RECEIVED,
        'test-holder-api-key',
      );
      expect(vcConnectionlessService.findOneByRecordId).toHaveBeenCalledWith(
        'vc-offer-record-123',
        'test-issuer-api-key',
      );
    });

    it('should throw error when issuer DID not found', async () => {
      (didService.getIssuerDid as jest.Mock).mockResolvedValue(null);

      await expect(processor.process(mockJob)).rejects.toThrow(
        'Issuer DID not found or not published',
      );

      expect(mockJob.updateProgress).toHaveBeenCalledWith(0);
      expect(mockJob.updateProgress).not.toHaveBeenCalledWith(12.5);
    });

    it('should throw error when issuer DID not published', async () => {
      const issuerDid = {
        did: 'did:prism:issuer123',
        status: DIDStatus.CREATED,
      };

      (didService.getIssuerDid as jest.Mock).mockResolvedValue(issuerDid);

      await expect(processor.process(mockJob)).rejects.toThrow(
        'Issuer DID not found or not published',
      );
    });

    it('should throw error when holder DID not found', async () => {
      const issuerDid = {
        did: 'did:prism:issuer123',
        status: DIDStatus.PUBLISHED,
      };

      (didService.getIssuerDid as jest.Mock).mockResolvedValue(issuerDid);
      (didService.findOne as jest.Mock).mockResolvedValue(null);

      await expect(processor.process(mockJob)).rejects.toThrow(
        'Holder DID not found or not published',
      );

      expect(mockJob.updateProgress).toHaveBeenCalledWith(12.5);
      expect(mockJob.updateProgress).not.toHaveBeenCalledWith(25);
    });

    it('should throw error when holder DID not published', async () => {
      const issuerDid = {
        did: 'did:prism:issuer123',
        status: DIDStatus.PUBLISHED,
      };

      const holderDid = {
        did: 'did:prism:holder456',
        status: DIDStatus.PUBLICATION_PENDING,
      };

      (didService.getIssuerDid as jest.Mock).mockResolvedValue(issuerDid);
      (didService.findOne as jest.Mock).mockResolvedValue(holderDid);

      await expect(processor.process(mockJob)).rejects.toThrow(
        'Holder DID not found or not published',
      );
    });

    it('should throw error when no invitation URL in VC offer response', async () => {
      const issuerDid = {
        did: 'did:prism:issuer123',
        status: DIDStatus.PUBLISHED,
      };

      const holderDid = {
        did: 'did:prism:holder456',
        status: DIDStatus.PUBLISHED,
      };

      const issuerRecordNoUrl = {
        recordId: 'vc-offer-record-123',
        invitation: {},
      };

      (didService.getIssuerDid as jest.Mock).mockResolvedValue(issuerDid);
      (didService.findOne as jest.Mock).mockResolvedValue(holderDid);
      (vcConnectionlessService.issuerCreateVcOffer as jest.Mock).mockResolvedValue(issuerRecordNoUrl);

      await expect(processor.process(mockJob)).rejects.toThrow(
        'No invitation URL in response',
      );

      expect(mockJob.updateProgress).toHaveBeenCalledWith(25);
      expect(mockJob.updateProgress).not.toHaveBeenCalledWith(37.5);
    });

    it('should handle AxiosError and create structured error response', async () => {
      const axiosError = new AxiosError('API Error', 'ERR_BAD_REQUEST');
      Object.defineProperty(axiosError, 'isAxiosError', { value: true });
      axiosError.response = {
        status: 400,
        data: {
          status: 400,
          type: '/errors/bad-request',
          title: 'Bad Request',
          detail: 'Invalid request data',
          instance: '/api/test',
        },
        statusText: 'Bad Request',
        headers: {},
        config: { url: '/api/test', headers: {} } as any,
      };

      (didService.getIssuerDid as jest.Mock).mockRejectedValue(axiosError);

      try {
        await processor.process(mockJob);
        fail('Expected error to be thrown');
      } catch (error) {
        const errorResponse = JSON.parse((error as Error).message) as ErrorResponseDto;
        expect(errorResponse).toEqual({
          status: 400,
          type: '/errors/bad-request',
          title: 'Bad Request',
          detail: 'Invalid request data',
          instance: '/api/test',
        });
      }
    });

    it('should handle AxiosError without structured response data', async () => {
      const axiosError = new AxiosError('Network Error', 'ERR_NETWORK');
      Object.defineProperty(axiosError, 'isAxiosError', { value: true });
      axiosError.config = { url: '/api/test', headers: {} } as any;
      axiosError.response = {
        status: 500,
        data: 'Server Error',
        statusText: 'Internal Server Error',
        headers: {},
        config: { url: '/api/test', headers: {} } as any,
      } as any;

      (didService.getIssuerDid as jest.Mock).mockRejectedValue(axiosError);

      try {
        await processor.process(mockJob);
        fail('Expected error to be thrown');
      } catch (error) {
        const errorResponse = JSON.parse((error as Error).message) as ErrorResponseDto;
        expect(errorResponse).toEqual({
          status: 500,
          type: '/errors/identus-api-error',
          title: 'Identus API Error',
          detail: 'Network Error',
          instance: '/api/test',
        });
      }
    });

    it('should handle generic errors', async () => {
      const genericError = new Error('Generic error message');

      (didService.getIssuerDid as jest.Mock).mockRejectedValue(genericError);

      try {
        await processor.process(mockJob);
        fail('Expected error to be thrown');
      } catch (error) {
        const errorResponse = JSON.parse((error as Error).message) as ErrorResponseDto;
        expect(errorResponse).toEqual({
          status: 500,
          type: '/errors/internal-server-error',
          title: 'Internal Server Error',
          detail: 'Generic error message',
        });
      }
    });

    it('should handle non-Error thrown objects', async () => {
      const nonErrorObject = 'String error';

      (didService.getIssuerDid as jest.Mock).mockRejectedValue(nonErrorObject);

      try {
        await processor.process(mockJob);
        fail('Expected error to be thrown');
      } catch (error) {
        const errorResponse = JSON.parse((error as Error).message) as ErrorResponseDto;
        expect(errorResponse).toEqual({
          status: 500,
          type: '/errors/internal-server-error',
          title: 'Internal Server Error',
          detail: 'An unexpected error occurred',
        });
      }
    });
  });

  describe('createErrorResponse', () => {
    it('should create error response from AxiosError with structured data', () => {
      const axiosError = new AxiosError('Test error');
      Object.defineProperty(axiosError, 'isAxiosError', { value: true });
      axiosError.response = {
        status: 404,
        data: {
          status: 404,
          type: '/errors/not-found',
          title: 'Not Found',
          detail: 'Resource not found',
        },
        statusText: 'Not Found',
        headers: {},
        config: { headers: {} } as any,
      };

      const result = (processor as any).createErrorResponse(axiosError);

      expect(result).toEqual({
        status: 404,
        type: '/errors/not-found',
        title: 'Not Found',
        detail: 'Resource not found',
      });
    });

    it('should create error response from AxiosError without structured data', () => {
      const axiosError = new AxiosError('Test error');
      Object.defineProperty(axiosError, 'isAxiosError', { value: true });
      axiosError.config = { url: '/test', headers: {} } as any;
      axiosError.response = {
        status: 500,
        data: 'Simple error',
        statusText: 'Internal Server Error',
        headers: {},
        config: { url: '/test', headers: {} } as any,
      } as any;

      const result = (processor as any).createErrorResponse(axiosError);

      expect(result).toEqual({
        status: 500,
        type: '/errors/identus-api-error',
        title: 'Identus API Error',
        detail: 'Test error',
        instance: '/test',
      });
    });

    it('should create error response from generic Error', () => {
      const error = new Error('Generic error');

      const result = (processor as any).createErrorResponse(error);

      expect(result).toEqual({
        status: 500,
        type: '/errors/internal-server-error',
        title: 'Internal Server Error',
        detail: 'Generic error',
      });
    });

    it('should create error response from non-Error object', () => {
      const nonError = 'String error';

      const result = (processor as any).createErrorResponse(nonError);

      expect(result).toEqual({
        status: 500,
        type: '/errors/internal-server-error',
        title: 'Internal Server Error',
        detail: 'An unexpected error occurred',
      });
    });
  });

  describe('isAxiosError', () => {
    it('should return true for AxiosError', () => {
      const axiosError = new AxiosError('Test error');
      Object.defineProperty(axiosError, 'isAxiosError', { value: true });

      const result = (processor as any).isAxiosError(axiosError);

      expect(result).toBe(true);
    });

    it('should return false for generic Error', () => {
      const error = new Error('Generic error');

      const result = (processor as any).isAxiosError(error);

      expect(result).toBe(false);
    });

    it('should return false for non-Error object', () => {
      const nonError = 'String error';

      const result = (processor as any).isAxiosError(nonError);

      expect(result).toBe(false);
    });
  });

  describe('onCompleted', () => {
    it('should log completion message', () => {
      const logSpy = jest.spyOn((processor as any).logger, 'log');

      processor.onCompleted(mockJob);

      expect(logSpy).toHaveBeenCalledWith(`Job ${mockJob.id} completed successfully`);
    });
  });

  describe('onFailed', () => {
    it('should log failure message', () => {
      const error = new Error('Test error');
      const logSpy = jest.spyOn((processor as any).logger, 'error');

      processor.onFailed(mockJob, error);

      expect(logSpy).toHaveBeenCalledWith(`Job ${mockJob.id} failed with error: ${error.message}`);
    });
  });
});