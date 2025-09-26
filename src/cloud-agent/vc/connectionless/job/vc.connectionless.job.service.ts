import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JobIdResponseDto, JobStatusEnum } from '../../../../common/dto/job.dto';
import { ErrorResponseDto } from '../../../../common/dto/error-response.dto';
import { IssueToHolderJobData } from './issue-to-holder.connectionless.processor';
import { IssueToHolderJobStatusResponseDto } from '../../dto/job/issue-to-holder.dto';
import { IssueCredentialRecordDto } from '../../dto/identus';

@Injectable()
export class VCConnectionlessJobService {
  private readonly logger = new Logger(VCConnectionlessJobService.name);

  constructor(
    @InjectQueue('issue-to-holder-connectionless')
    private issueToHolderQueue: Queue<IssueToHolderJobData>,
  ) {}

  /**
   * VC発行ジョブを開始
   */
  async startIssueToHolderJob(
    claims: Record<string, any>,
    holderApiKey: string,
  ): Promise<JobIdResponseDto> {
    const job = await this.issueToHolderQueue.add(
      'issue-to-holder-connectionless',
      { claims, holderApiKey },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        delay: 1000, // 1 second delay before starting
      },
    );

    this.logger.log(`Job ${job.id} created successfully`);

    return {
      jobId: job.id!,
    };
  }

  /**
   * ジョブのステータスを取得
   */
  async getJobStatus(
    jobId: string,
  ): Promise<IssueToHolderJobStatusResponseDto> {
    this.logger.log(`Getting job status for job ${jobId}`);

    const job = await this.issueToHolderQueue.getJob(jobId);

    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }

    const state = await job.getState();
    let status: string;
    let progress = (job.progress as number) || 0;
    let result: IssueCredentialRecordDto | undefined = undefined;
    let failedReason: ErrorResponseDto | undefined = undefined;

    // Map BullMQ states to our job status
    switch (state) {
      case 'completed':
        status = JobStatusEnum.COMPLETED;
        progress = 100;
        result = job.returnvalue;
        this.logger.log(`Job ${jobId} completed successfully`);
        break;
      case 'failed':
        status = JobStatusEnum.FAILED;
        progress = (job.progress as number) || 0;
        if (job.failedReason) {
          try {
            failedReason = JSON.parse(job.failedReason);
          } catch {
            failedReason = {
              status: 500,
              type: '/errors/job-failed',
              title: 'Job Failed',
              detail: job.failedReason,
            };
          }
        }
        this.logger.error(`Job ${jobId} failed: ${job.failedReason}`);
        break;
      case 'active':
        status = JobStatusEnum.IN_PROGRESS;
        this.logger.log(`Job ${jobId} is active with ${progress}% progress`);
        break;
      case 'waiting':
      case 'delayed':
        status = 'pending';
        progress = 0;
        this.logger.log(`Job ${jobId} is pending`);
        break;
      default:
        status = 'pending';
        progress = 0;
        this.logger.log(`Job ${jobId} has unknown state: ${state}`);
        break;
    }

    return {
      id: jobId,
      status,
      progress,
      result,
      failedReason,
    };
  }
}
