import { Test, TestingModule } from '@nestjs/testing';
import { DidJobService } from './did.job.service';
import { DidService } from '../did.service';
import { getQueueToken } from '@nestjs/bullmq';
import { NotFoundException } from '@nestjs/common';
import { JobStatusEnum } from '../../../common/dto/job.dto';
import { ManagedDIDDto } from '../dto/identus/managed-did.dto';

describe('DidJobService', () => {
  let service: DidJobService;
  let didService: DidService;
  let mockQueue: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock Queue
    mockQueue = {
      add: jest.fn(),
      getJob: jest.fn(),
    };

    // Mock DidService
    const mockDidService = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DidJobService,
        {
          provide: getQueueToken('create-and-publish'),
          useValue: mockQueue,
        },
        {
          provide: DidService,
          useValue: mockDidService,
        },
      ],
    }).compile();

    service = module.get<DidJobService>(DidJobService);
    didService = module.get<DidService>(DidService);
  });

  describe('startCreateAndPublishJob', () => {
    it('should start create and publish job successfully', async () => {
      const userApiKey = 'test-api-key';
      const mockJob = {
        id: 'job-123',
      };

      mockQueue.add.mockResolvedValue(mockJob);

      const result = await service.startCreateAndPublishJob(userApiKey);

      expect(result).toEqual({
        jobId: 'job-123',
      });
      expect(mockQueue.add).toHaveBeenCalledWith(
        'create-and-publish',
        { userApiKey },
        {
          attempts: 1,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      );
    });

    it('should handle job creation failure', async () => {
      const userApiKey = 'test-api-key';

      mockQueue.add.mockRejectedValue(new Error('Queue unavailable'));

      await expect(
        service.startCreateAndPublishJob(userApiKey),
      ).rejects.toThrow('Queue unavailable');
      expect(mockQueue.add).toHaveBeenCalled();
    });
  });

  describe('getJobStatus', () => {
    const jobId = 'job-123';
    const userApiKey = 'test-api-key';

    it('should throw NotFoundException when job not found', async () => {
      mockQueue.getJob.mockResolvedValue(null);

      await expect(service.getJobStatus(jobId, userApiKey)).rejects.toThrow(
        new NotFoundException(`Job ${jobId} not found`),
      );
    });

    describe('completed job', () => {
      it('should return completed status when DID is published', async () => {
        const mockJob = {
          id: jobId,
          progress: 100,
          returnvalue: { did: 'test-did' },
          getState: jest.fn().mockResolvedValue('completed'),
        };

        const mockDid: ManagedDIDDto = {
          did: 'test-did',
          status: 'PUBLISHED',
          longFormDid: 'long-form-did',
          keyId: 'key-id',
        };

        mockQueue.getJob.mockResolvedValue(mockJob);
        (didService.findOne as jest.Mock).mockResolvedValue(mockDid);

        const result = await service.getJobStatus(jobId, userApiKey);

        expect(result).toEqual({
          id: jobId,
          status: JobStatusEnum.COMPLETED,
          progress: 100,
          result: mockDid,
          failedReason: undefined,
        });
        expect(didService.findOne).toHaveBeenCalledWith(userApiKey);
      });

      it('should return in-progress status when DID not yet published', async () => {
        const mockJob = {
          id: jobId,
          progress: 75,
          returnvalue: { did: 'test-did' },
          getState: jest.fn().mockResolvedValue('completed'),
        };

        const mockDid: ManagedDIDDto = {
          did: 'test-did',
          status: 'CREATED',
          longFormDid: 'long-form-did',
          keyId: 'key-id',
        };

        mockQueue.getJob.mockResolvedValue(mockJob);
        (didService.findOne as jest.Mock).mockResolvedValue(mockDid);

        const result = await service.getJobStatus(jobId, userApiKey);

        expect(result).toEqual({
          id: jobId,
          status: JobStatusEnum.IN_PROGRESS,
          progress: 75,
          result: mockDid,
          failedReason: undefined,
        });
      });

      it('should fallback to job return value when DID check fails', async () => {
        const mockJob = {
          id: jobId,
          progress: 100,
          returnvalue: { did: 'test-did' },
          getState: jest.fn().mockResolvedValue('completed'),
        };

        mockQueue.getJob.mockResolvedValue(mockJob);
        (didService.findOne as jest.Mock).mockRejectedValue(
          new Error('API error'),
        );

        const result = await service.getJobStatus(jobId, userApiKey);

        expect(result).toEqual({
          id: jobId,
          status: JobStatusEnum.COMPLETED,
          progress: 100,
          result: { did: 'test-did' },
          failedReason: undefined,
        });
      });
    });

    describe('failed job', () => {
      it('should return failed status with parsed error', async () => {
        const mockJob = {
          id: jobId,
          progress: 50,
          failedReason: JSON.stringify({
            status: 400,
            type: '/errors/bad-request',
            title: 'Bad Request',
            detail: 'Invalid input',
          }),
          getState: jest.fn().mockResolvedValue('failed'),
        };

        mockQueue.getJob.mockResolvedValue(mockJob);

        const result = await service.getJobStatus(jobId, userApiKey);

        expect(result).toEqual({
          id: jobId,
          status: JobStatusEnum.FAILED,
          progress: 50,
          result: undefined,
          failedReason: {
            status: 400,
            type: '/errors/bad-request',
            title: 'Bad Request',
            detail: 'Invalid input',
          },
        });
      });

      it('should return failed status with default error format for invalid JSON', async () => {
        const mockJob = {
          id: jobId,
          progress: 25,
          failedReason: 'Network error',
          getState: jest.fn().mockResolvedValue('failed'),
        };

        mockQueue.getJob.mockResolvedValue(mockJob);

        const result = await service.getJobStatus(jobId, userApiKey);

        expect(result).toEqual({
          id: jobId,
          status: JobStatusEnum.FAILED,
          progress: 25,
          result: undefined,
          failedReason: {
            status: 500,
            type: '/errors/job-failed',
            title: 'Job Failed',
            detail: 'Network error',
          },
        });
      });

      it('should return failed status without failedReason when not provided', async () => {
        const mockJob = {
          id: jobId,
          progress: 0,
          failedReason: null,
          getState: jest.fn().mockResolvedValue('failed'),
        };

        mockQueue.getJob.mockResolvedValue(mockJob);

        const result = await service.getJobStatus(jobId, userApiKey);

        expect(result).toEqual({
          id: jobId,
          status: JobStatusEnum.FAILED,
          progress: 0,
          result: undefined,
          failedReason: undefined,
        });
      });
    });

    describe('in-progress job', () => {
      it('should return in-progress status for active job', async () => {
        const mockJob = {
          id: jobId,
          progress: 50,
          getState: jest.fn().mockResolvedValue('active'),
        };

        mockQueue.getJob.mockResolvedValue(mockJob);

        const result = await service.getJobStatus(jobId, userApiKey);

        expect(result).toEqual({
          id: jobId,
          status: JobStatusEnum.IN_PROGRESS,
          progress: 50,
          result: undefined,
          failedReason: undefined,
        });
        expect(didService.findOne).not.toHaveBeenCalled();
      });

      it('should return in-progress status for waiting job', async () => {
        const mockJob = {
          id: jobId,
          progress: 0,
          getState: jest.fn().mockResolvedValue('waiting'),
        };

        mockQueue.getJob.mockResolvedValue(mockJob);

        const result = await service.getJobStatus(jobId, userApiKey);

        expect(result).toEqual({
          id: jobId,
          status: JobStatusEnum.IN_PROGRESS,
          progress: 0,
          result: undefined,
          failedReason: undefined,
        });
      });

      it('should check DID status when job progress >= 75%', async () => {
        const mockJob = {
          id: jobId,
          progress: 75,
          getState: jest.fn().mockResolvedValue('active'),
        };

        const mockDid: ManagedDIDDto = {
          did: 'test-did',
          status: 'CREATED',
          longFormDid: 'long-form-did',
          keyId: 'key-id',
        };

        mockQueue.getJob.mockResolvedValue(mockJob);
        (didService.findOne as jest.Mock).mockResolvedValue(mockDid);

        const result = await service.getJobStatus(jobId, userApiKey);

        expect(result).toEqual({
          id: jobId,
          status: JobStatusEnum.IN_PROGRESS,
          progress: 75,
          result: mockDid,
          failedReason: undefined,
        });
        expect(didService.findOne).toHaveBeenCalledWith(userApiKey);
      });

      it('should mark as completed when DID becomes published at 75% progress', async () => {
        const mockJob = {
          id: jobId,
          progress: 75,
          getState: jest.fn().mockResolvedValue('active'),
        };

        const mockDid: ManagedDIDDto = {
          did: 'test-did',
          status: 'PUBLISHED',
          longFormDid: 'long-form-did',
          keyId: 'key-id',
        };

        mockQueue.getJob.mockResolvedValue(mockJob);
        (didService.findOne as jest.Mock).mockResolvedValue(mockDid);

        const result = await service.getJobStatus(jobId, userApiKey);

        expect(result).toEqual({
          id: jobId,
          status: JobStatusEnum.COMPLETED,
          progress: 100,
          result: mockDid,
          failedReason: undefined,
        });
      });

      it('should handle DID check error gracefully for in-progress job', async () => {
        const mockJob = {
          id: jobId,
          progress: 75,
          getState: jest.fn().mockResolvedValue('active'),
        };

        mockQueue.getJob.mockResolvedValue(mockJob);
        (didService.findOne as jest.Mock).mockRejectedValue(
          new Error('API error'),
        );

        const result = await service.getJobStatus(jobId, userApiKey);

        expect(result).toEqual({
          id: jobId,
          status: JobStatusEnum.IN_PROGRESS,
          progress: 75,
          result: undefined,
          failedReason: undefined,
        });
      });

      it('should handle undefined progress', async () => {
        const mockJob = {
          id: jobId,
          progress: undefined,
          getState: jest.fn().mockResolvedValue('waiting'),
        };

        mockQueue.getJob.mockResolvedValue(mockJob);

        const result = await service.getJobStatus(jobId, userApiKey);

        expect(result).toEqual({
          id: jobId,
          status: JobStatusEnum.IN_PROGRESS,
          progress: 0,
          result: undefined,
          failedReason: undefined,
        });
      });
    });

    describe('delayed job', () => {
      it('should return in-progress status for delayed job', async () => {
        const mockJob = {
          id: jobId,
          progress: 0,
          getState: jest.fn().mockResolvedValue('delayed'),
        };

        mockQueue.getJob.mockResolvedValue(mockJob);

        const result = await service.getJobStatus(jobId, userApiKey);

        expect(result).toEqual({
          id: jobId,
          status: JobStatusEnum.IN_PROGRESS,
          progress: 0,
          result: undefined,
          failedReason: undefined,
        });
      });
    });

    describe('unknown job state', () => {
      it('should handle unknown job state as in-progress', async () => {
        const mockJob = {
          id: jobId,
          progress: 10,
          getState: jest.fn().mockResolvedValue('unknown'),
        };

        mockQueue.getJob.mockResolvedValue(mockJob);

        const result = await service.getJobStatus(jobId, userApiKey);

        expect(result).toEqual({
          id: jobId,
          status: JobStatusEnum.IN_PROGRESS,
          progress: 10,
          result: undefined,
          failedReason: undefined,
        });
      });
    });
  });
});
