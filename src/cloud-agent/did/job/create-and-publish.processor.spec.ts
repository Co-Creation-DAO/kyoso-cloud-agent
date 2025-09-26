import { Test, TestingModule } from '@nestjs/testing';
import { CreateAndPublishProcessor } from './create-and-publish.processor';
import { DidService } from '../did.service';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { AxiosError } from 'axios';
import { DIDStatus } from '../dto/identus/did-status.dto';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';

describe('CreateAndPublishProcessor', () => {
  let processor: CreateAndPublishProcessor;
  let didService: jest.Mocked<DidService>;
  let mockJob: jest.Mocked<Job>;

  beforeEach(async () => {
    const mockDidService = {
      findOne: jest.fn(),
      create: jest.fn(),
      publish: jest.fn(),
      findOneByLongFormDid: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateAndPublishProcessor,
        {
          provide: DidService,
          useValue: mockDidService,
        },
      ],
    }).compile();

    processor = module.get<CreateAndPublishProcessor>(
      CreateAndPublishProcessor,
    );
    didService = module.get(DidService);

    mockJob = {
      id: '123',
      data: { userApiKey: 'test-api-key' },
      updateProgress: jest.fn().mockResolvedValue(undefined),
    } as any;

    jest.clearAllMocks();
    jest.spyOn(processor['logger'], 'log').mockImplementation();
    jest.spyOn(processor['logger'], 'warn').mockImplementation();
    jest.spyOn(processor['logger'], 'error').mockImplementation();
  });

  describe('process', () => {
    describe('existing DID scenarios', () => {
      it('should return existing DID when status is PUBLISHED', async () => {
        const existingDid = {
          did: 'did:prism:test123',
          status: DIDStatus.PUBLISHED,
        };
        didService.findOne.mockResolvedValue(existingDid);

        const result = await processor.process(mockJob);

        expect(result).toBe(existingDid);
        expect(mockJob.updateProgress).toHaveBeenCalledWith(25);
        expect(mockJob.updateProgress).toHaveBeenCalledWith(100);
        expect(didService.findOne).toHaveBeenCalledWith('test-api-key');
        expect(didService.create).not.toHaveBeenCalled();
        expect(didService.publish).not.toHaveBeenCalled();
      });

      it('should return existing DID when status is PUBLICATION_PENDING', async () => {
        const existingDid = {
          did: 'did:prism:test123',
          status: DIDStatus.PUBLICATION_PENDING,
        };
        didService.findOne.mockResolvedValue(existingDid);

        const result = await processor.process(mockJob);

        expect(result).toBe(existingDid);
        expect(mockJob.updateProgress).toHaveBeenCalledWith(25);
        expect(mockJob.updateProgress).toHaveBeenCalledWith(75);
        expect(didService.create).not.toHaveBeenCalled();
        expect(didService.publish).not.toHaveBeenCalled();
      });

      it('should proceed to publish when existing DID status is CREATED', async () => {
        const existingDid = {
          did: 'did:prism:test123',
          status: DIDStatus.CREATED,
        };
        const publishedDid = {
          did: 'did:prism:test123',
          status: DIDStatus.PUBLISHED,
        };
        didService.findOne.mockResolvedValue(existingDid);
        didService.publish.mockResolvedValue(undefined);
        didService.findOneByLongFormDid.mockResolvedValue(publishedDid);

        const result = await processor.process(mockJob);

        expect(result).toBe(publishedDid);
        expect(mockJob.updateProgress).toHaveBeenCalledWith(25);
        expect(mockJob.updateProgress).toHaveBeenCalledWith(75);
        expect(didService.publish).toHaveBeenCalledWith(
          'test-api-key',
          'did:prism:test123',
        );
        expect(didService.findOneByLongFormDid).toHaveBeenCalledWith(
          'test-api-key',
          'did:prism:test123',
        );
      });

      it('should warn and continue when existing DID has unexpected status', async () => {
        const existingDid = {
          did: 'did:prism:test123',
          status: 'UNEXPECTED_STATUS' as any,
        };
        didService.findOne.mockResolvedValue(existingDid);

        const result = await processor.process(mockJob);

        expect(result).toBe(existingDid);
        expect(processor['logger'].warn).toHaveBeenCalledWith(
          expect.stringContaining('Unexpected DID status: UNEXPECTED_STATUS'),
        );
      });
    });

    describe('new DID creation scenarios', () => {
      it('should create new DID and publish it', async () => {
        const createdDid = {
          longFormDid: 'did:prism:longform123',
        };
        const didDetails = {
          did: 'did:prism:test123',
          status: DIDStatus.CREATED,
        };
        const publishedDid = {
          did: 'did:prism:test123',
          status: DIDStatus.PUBLISHED,
        };

        didService.findOne.mockResolvedValue(null);
        didService.create.mockResolvedValue(createdDid);
        didService.findOneByLongFormDid
          .mockResolvedValueOnce(didDetails)
          .mockResolvedValueOnce(publishedDid);
        didService.publish.mockResolvedValue(undefined);

        const result = await processor.process(mockJob);

        expect(result).toBe(publishedDid);
        expect(mockJob.updateProgress).toHaveBeenCalledWith(25);
        expect(mockJob.updateProgress).toHaveBeenCalledWith(50);
        expect(mockJob.updateProgress).toHaveBeenCalledWith(75);
        expect(didService.create).toHaveBeenCalledWith('test-api-key');
        expect(didService.publish).toHaveBeenCalledWith(
          'test-api-key',
          'did:prism:test123',
        );
      });

      it('should create new DID but not publish if status is not CREATED', async () => {
        const createdDid = {
          longFormDid: 'did:prism:longform123',
        };
        const didDetails = {
          did: 'did:prism:test123',
          status: DIDStatus.PUBLICATION_PENDING,
        };

        didService.findOne.mockResolvedValue(null);
        didService.create.mockResolvedValue(createdDid);
        didService.findOneByLongFormDid.mockResolvedValue(didDetails);

        const result = await processor.process(mockJob);

        expect(result).toBe(didDetails);
        expect(didService.publish).not.toHaveBeenCalled();
      });
    });

    describe('error handling', () => {
      it('should handle and transform AxiosError with response data', async () => {
        const errorResponseData: ErrorResponseDto = {
          status: 404,
          type: '/errors/not-found',
          title: 'Not Found',
          detail: 'DID not found',
          instance: '/did-registrar/dids',
        };

        const axiosError = new AxiosError('Request failed');
        axiosError.response = {
          status: 404,
          data: errorResponseData,
        } as any;
        Object.defineProperty(axiosError, 'isAxiosError', { value: true });

        didService.findOne.mockRejectedValue(axiosError);

        await expect(processor.process(mockJob)).rejects.toThrow(
          JSON.stringify(errorResponseData),
        );

        expect(processor['logger'].error).toHaveBeenCalled();
      });

      it('should handle AxiosError without response data', async () => {
        const axiosError = new AxiosError('Network Error');
        axiosError.response = {
          status: 500,
        } as any;
        axiosError.config = {
          url: '/test-endpoint',
        } as any;
        Object.defineProperty(axiosError, 'isAxiosError', { value: true });

        didService.findOne.mockRejectedValue(axiosError);

        await expect(processor.process(mockJob)).rejects.toThrow();

        const thrownError = await processor
          .process(mockJob)
          .catch((err) => err);
        const errorData = JSON.parse(thrownError.message);

        expect(errorData).toEqual({
          status: 500,
          type: '/errors/identus-api-error',
          title: 'Identus API Error',
          detail: 'Network Error',
          instance: '/test-endpoint',
        });
      });

      it('should handle generic errors', async () => {
        const genericError = new Error('Generic error');
        didService.findOne.mockRejectedValue(genericError);

        await expect(processor.process(mockJob)).rejects.toThrow();

        const thrownError = await processor
          .process(mockJob)
          .catch((err) => err);
        const errorData = JSON.parse(thrownError.message);

        expect(errorData).toEqual({
          status: 500,
          type: '/errors/internal-server-error',
          title: 'Internal Server Error',
          detail: 'Generic error',
        });
      });

      it('should handle unknown error types', async () => {
        const unknownError = 'string error';
        didService.findOne.mockRejectedValue(unknownError);

        await expect(processor.process(mockJob)).rejects.toThrow();

        const thrownError = await processor
          .process(mockJob)
          .catch((err) => err);
        const errorData = JSON.parse(thrownError.message);

        expect(errorData).toEqual({
          status: 500,
          type: '/errors/internal-server-error',
          title: 'Internal Server Error',
          detail: 'An unexpected error occurred',
        });
      });
    });
  });

  describe('createErrorResponse', () => {
    it('should create error response from AxiosError with response data', () => {
      const responseData: ErrorResponseDto = {
        status: 400,
        type: '/errors/bad-request',
        title: 'Bad Request',
        detail: 'Invalid request',
      };

      const axiosError = new AxiosError('Bad Request');
      axiosError.response = {
        status: 400,
        data: responseData,
      } as any;
      Object.defineProperty(axiosError, 'isAxiosError', { value: true });

      const result = processor['createErrorResponse'](axiosError);

      expect(result).toEqual(responseData);
    });

    it('should create standard error response from AxiosError without response data', () => {
      const axiosError = new AxiosError('Connection timeout');
      axiosError.response = {
        status: 408,
      } as any;
      axiosError.config = {
        url: '/timeout-endpoint',
      } as any;
      Object.defineProperty(axiosError, 'isAxiosError', { value: true });

      const result = processor['createErrorResponse'](axiosError);

      expect(result).toEqual({
        status: 408,
        type: '/errors/identus-api-error',
        title: 'Identus API Error',
        detail: 'Connection timeout',
        instance: '/timeout-endpoint',
      });
    });

    it('should default to 500 for AxiosError without status', () => {
      const axiosError = new AxiosError('Unknown error');
      Object.defineProperty(axiosError, 'isAxiosError', { value: true });

      const result = processor['createErrorResponse'](axiosError);

      expect(result).toEqual({
        status: 500,
        type: '/errors/identus-api-error',
        title: 'Identus API Error',
        detail: 'Unknown error',
        instance: undefined,
      });
    });
  });

  describe('isAxiosError', () => {
    it('should identify AxiosError correctly', () => {
      const axiosError = new AxiosError('Test');
      Object.defineProperty(axiosError, 'isAxiosError', { value: true });

      const result = processor['isAxiosError'](axiosError);

      expect(result).toBe(true);
    });

    it('should reject non-AxiosError', () => {
      const regularError = new Error('Test');

      const result = processor['isAxiosError'](regularError);

      expect(result).toBe(false);
    });

    it('should reject non-Error objects', () => {
      const notError = { isAxiosError: true };

      const result = processor['isAxiosError'](notError);

      expect(result).toBe(false);
    });
  });

  describe('event handlers', () => {
    it('should log completion', () => {
      processor.onCompleted(mockJob);

      expect(processor['logger'].log).toHaveBeenCalledWith(
        'Job 123 completed successfully',
      );
    });

    it('should log failure', () => {
      const error = new Error('Job failed');

      processor.onFailed(mockJob, error);

      expect(processor['logger'].error).toHaveBeenCalledWith(
        'Job 123 failed with error: Job failed',
      );
    });
  });
});
