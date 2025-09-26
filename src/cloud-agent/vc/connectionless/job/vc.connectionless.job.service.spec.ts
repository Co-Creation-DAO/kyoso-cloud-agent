import { Test, TestingModule } from '@nestjs/testing';
import { VCConnectionlessJobService } from './vc.connectionless.job.service';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { NotFoundException } from '@nestjs/common';
import { JobStatusEnum } from '../../../../common/dto/job.dto';

describe('VCConnectionlessJobService', () => {
  let service: VCConnectionlessJobService;
  let mockQueue: jest.Mocked<Queue>;

  beforeEach(async () => {
    mockQueue = {
      add: jest.fn(),
      getJob: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VCConnectionlessJobService,
        {
          provide: getQueueToken('issue-to-holder-connectionless'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<VCConnectionlessJobService>(
      VCConnectionlessJobService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('startIssueToHolderJob', () => {
    it('should create a job successfully', async () => {
      const claims = { name: 'John Doe', age: 30 };
      const holderApiKey = 'test-api-key';
      const mockJob = { id: 'job-123' } as Job;

      mockQueue.add.mockResolvedValue(mockJob);

      const result = await service.startIssueToHolderJob(claims, holderApiKey);

      expect(result).toEqual({ jobId: 'job-123' });
      expect(mockQueue.add).toHaveBeenCalledWith(
        'issue-to-holder-connectionless',
        { claims, holderApiKey },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          delay: 1000,
        },
      );
      expect(mockQueue.add).toHaveBeenCalledTimes(1);
    });

    it('should handle job creation with empty claims', async () => {
      const claims = {};
      const holderApiKey = 'test-api-key';
      const mockJob = { id: 'job-456' } as Job;

      mockQueue.add.mockResolvedValue(mockJob);

      const result = await service.startIssueToHolderJob(claims, holderApiKey);

      expect(result).toEqual({ jobId: 'job-456' });
      expect(mockQueue.add).toHaveBeenCalledWith(
        'issue-to-holder-connectionless',
        { claims, holderApiKey },
        expect.any(Object),
      );
    });

    it('should handle job creation failure', async () => {
      const claims = { name: 'John Doe' };
      const holderApiKey = 'test-api-key';

      mockQueue.add.mockRejectedValue(new Error('Queue error'));

      await expect(
        service.startIssueToHolderJob(claims, holderApiKey),
      ).rejects.toThrow('Queue error');
    });
  });

  describe('getJobStatus', () => {
    it('should return job status for completed job', async () => {
      const jobId = 'job-123';
      const mockResult = {
        id: 'test-id',
        status: 'issued',
        credential: { type: 'VerifiableCredential' },
      };
      const mockJob = {
        getState: jest.fn().mockResolvedValue('completed'),
        progress: 100,
        returnvalue: mockResult,
        failedReason: null,
      } as any;

      mockQueue.getJob.mockResolvedValue(mockJob);

      const result = await service.getJobStatus(jobId);

      expect(result).toEqual({
        id: jobId,
        status: JobStatusEnum.COMPLETED,
        progress: 100,
        result: mockResult,
        failedReason: undefined,
      });
      expect(mockQueue.getJob).toHaveBeenCalledWith(jobId);
      expect(mockJob.getState).toHaveBeenCalled();
    });

    it('should return job status for failed job', async () => {
      const jobId = 'job-456';
      const mockFailedReason = JSON.stringify({
        status: 500,
        type: '/errors/credential-issue-failed',
        title: 'Credential Issue Failed',
        detail: 'API returned 500',
      });
      const mockJob = {
        getState: jest.fn().mockResolvedValue('failed'),
        progress: 50,
        returnvalue: null,
        failedReason: mockFailedReason,
      } as any;

      mockQueue.getJob.mockResolvedValue(mockJob);

      const result = await service.getJobStatus(jobId);

      expect(result).toEqual({
        id: jobId,
        status: JobStatusEnum.FAILED,
        progress: 50,
        result: undefined,
        failedReason: {
          status: 500,
          type: '/errors/credential-issue-failed',
          title: 'Credential Issue Failed',
          detail: 'API returned 500',
        },
      });
    });

    it('should return job status for failed job with plain text error', async () => {
      const jobId = 'job-789';
      const mockJob = {
        getState: jest.fn().mockResolvedValue('failed'),
        progress: 25,
        returnvalue: null,
        failedReason: 'Network connection failed',
      } as any;

      mockQueue.getJob.mockResolvedValue(mockJob);

      const result = await service.getJobStatus(jobId);

      expect(result).toEqual({
        id: jobId,
        status: JobStatusEnum.FAILED,
        progress: 25,
        result: undefined,
        failedReason: {
          status: 500,
          type: '/errors/job-failed',
          title: 'Job Failed',
          detail: 'Network connection failed',
        },
      });
    });

    it('should return job status for active job', async () => {
      const jobId = 'job-active';
      const mockJob = {
        getState: jest.fn().mockResolvedValue('active'),
        progress: 75,
        returnvalue: null,
        failedReason: null,
      } as any;

      mockQueue.getJob.mockResolvedValue(mockJob);

      const result = await service.getJobStatus(jobId);

      expect(result).toEqual({
        id: jobId,
        status: JobStatusEnum.IN_PROGRESS,
        progress: 75,
        result: undefined,
        failedReason: undefined,
      });
    });

    it('should return job status for waiting job', async () => {
      const jobId = 'job-waiting';
      const mockJob = {
        getState: jest.fn().mockResolvedValue('waiting'),
        progress: 0,
        returnvalue: null,
        failedReason: null,
      } as any;

      mockQueue.getJob.mockResolvedValue(mockJob);

      const result = await service.getJobStatus(jobId);

      expect(result).toEqual({
        id: jobId,
        status: 'pending',
        progress: 0,
        result: undefined,
        failedReason: undefined,
      });
    });

    it('should return job status for delayed job', async () => {
      const jobId = 'job-delayed';
      const mockJob = {
        getState: jest.fn().mockResolvedValue('delayed'),
        progress: 0,
        returnvalue: null,
        failedReason: null,
      } as any;

      mockQueue.getJob.mockResolvedValue(mockJob);

      const result = await service.getJobStatus(jobId);

      expect(result).toEqual({
        id: jobId,
        status: 'pending',
        progress: 0,
        result: undefined,
        failedReason: undefined,
      });
    });

    it('should return job status for unknown state', async () => {
      const jobId = 'job-unknown';
      const mockJob = {
        getState: jest.fn().mockResolvedValue('stalled'),
        progress: 10,
        returnvalue: null,
        failedReason: null,
      } as any;

      mockQueue.getJob.mockResolvedValue(mockJob);

      const result = await service.getJobStatus(jobId);

      expect(result).toEqual({
        id: jobId,
        status: 'pending',
        progress: 0,
        result: undefined,
        failedReason: undefined,
      });
    });

    it('should handle job with undefined progress', async () => {
      const jobId = 'job-no-progress';
      const mockJob = {
        getState: jest.fn().mockResolvedValue('active'),
        progress: undefined,
        returnvalue: null,
        failedReason: null,
      } as any;

      mockQueue.getJob.mockResolvedValue(mockJob);

      const result = await service.getJobStatus(jobId);

      expect(result).toEqual({
        id: jobId,
        status: JobStatusEnum.IN_PROGRESS,
        progress: 0,
        result: undefined,
        failedReason: undefined,
      });
    });

    it('should handle failed job with undefined progress', async () => {
      const jobId = 'job-failed-no-progress';
      const mockJob = {
        getState: jest.fn().mockResolvedValue('failed'),
        progress: undefined,
        returnvalue: null,
        failedReason: 'Failed with no progress',
      } as any;

      mockQueue.getJob.mockResolvedValue(mockJob);

      const result = await service.getJobStatus(jobId);

      expect(result.progress).toBe(0);
      expect(result.status).toBe(JobStatusEnum.FAILED);
    });

    it('should throw NotFoundException when job does not exist', async () => {
      const jobId = 'non-existent-job';
      mockQueue.getJob.mockResolvedValue(null);

      await expect(service.getJobStatus(jobId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getJobStatus(jobId)).rejects.toThrow(
        `Job ${jobId} not found`,
      );
    });

    it('should handle getJob throwing an error', async () => {
      const jobId = 'error-job';
      mockQueue.getJob.mockRejectedValue(new Error('Database connection lost'));

      await expect(service.getJobStatus(jobId)).rejects.toThrow(
        'Database connection lost',
      );
    });

    it('should handle getState throwing an error', async () => {
      const jobId = 'state-error-job';
      const mockJob = {
        getState: jest.fn().mockRejectedValue(new Error('State fetch error')),
        progress: 0,
        returnvalue: null,
        failedReason: null,
      } as any;

      mockQueue.getJob.mockResolvedValue(mockJob);

      await expect(service.getJobStatus(jobId)).rejects.toThrow(
        'State fetch error',
      );
    });
  });
});
