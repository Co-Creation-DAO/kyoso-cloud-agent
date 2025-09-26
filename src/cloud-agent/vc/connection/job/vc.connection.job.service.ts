import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JobIdResponseDto, JobStatusEnum } from '../../../../common/dto/job.dto';
import { ErrorResponseDto } from '../../../../common/dto/error-response.dto';
import { IssueCredentialRecordDto } from '../../dto/identus';
import { IssueToHolderConnectionJobData } from './issue-to-holder-connection.processor';
import { IssueToHolderJobStatusResponseDto } from '../../dto/job/issue-to-holder.dto';

@Injectable()
export class VCConnectionJobService {
  private readonly logger = new Logger(VCConnectionJobService.name);

  constructor(
    @InjectQueue('issue-to-holder-connection')
    private issueToHolderQueue: Queue<IssueToHolderConnectionJobData>,
  ) {}

  async startIssueToHolderJob(
    claims: Record<string, any>,
    holderApiKey: string,
  ): Promise<JobIdResponseDto> {
    const job = await this.issueToHolderQueue.add(
      'issue-to-holder-connection',
      { claims, holderApiKey },
      {
        attempts: 1,
        backoff: { type: 'exponential', delay: 5000 },
        delay: 1000,
      },
    );

    this.logger.log(`Job ${job.id} created successfully`);
    return { jobId: job.id! };
  }

  async getJobStatus(
    jobId: string,
  ): Promise<IssueToHolderJobStatusResponseDto> {
    this.logger.log(`Getting job status for job ${jobId}`);
    const job = await this.issueToHolderQueue.getJob(jobId);
    if (!job) throw new NotFoundException(`Job ${jobId} not found`);

    const state = await job.getState();
    let status: string;
    let progress = (job.progress as number) || 0;
    let result: IssueCredentialRecordDto | undefined = undefined;
    let failedReason: ErrorResponseDto | undefined = undefined;

    switch (state) {
      case 'completed':
        status = JobStatusEnum.COMPLETED;
        progress = 100;
        result = job.returnvalue;
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
        break;
      case 'active':
        status = JobStatusEnum.IN_PROGRESS;
        break;
      case 'waiting':
      case 'delayed':
      default:
        status = 'pending';
        progress = 0;
        break;
    }

    return { id: jobId, status, progress, result, failedReason };
  }
}
