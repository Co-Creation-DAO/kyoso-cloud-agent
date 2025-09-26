import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JobIdResponseDto } from '../../../common/dto/job.dto';
import { JobStatusEnum } from '../../../common/dto/job.dto';
import { CreateAndPublishJobStatusResponseDto } from '../dto/job/create-and-publish.dto';
import { CreateAndPublishJobData } from './create-and-publish.processor';
import { DidService } from '../did.service';
import { ErrorResponseDto } from '../../../common/dto/error-response.dto';
import { ManagedDIDDto } from '../dto/identus/managed-did.dto';

@Injectable()
export class DidJobService {
  private readonly logger = new Logger(DidJobService.name);

  constructor(
    @InjectQueue('create-and-publish')
    private createAndPublishQueue: Queue<CreateAndPublishJobData>,
    private readonly didService: DidService,
  ) {}

  /**
   * DID作成と公開のジョブを開始
   */
  async startCreateAndPublishJob(
    userApiKey: string,
  ): Promise<JobIdResponseDto> {
    this.logger.log(
      `Starting create-and-publish job for userApiKey: ${userApiKey}`,
    );

    const job = await this.createAndPublishQueue.add(
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
    userApiKey: string,
  ): Promise<CreateAndPublishJobStatusResponseDto> {
    this.logger.log(`Getting job status for job ${jobId}`);

    const job = await this.createAndPublishQueue.getJob(jobId);

    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }

    const state = await job.getState();
    let status: JobStatusEnum;
    let progress = (job.progress as number) || 0;
    let result: ManagedDIDDto | undefined = undefined;
    let failedReason: ErrorResponseDto | undefined = undefined;

    // Map BullMQ states to our JobStatusEnum
    switch (state) {
      case 'completed':
        ({ status, progress, result } = await this.handleCompletedJob(
          job,
          userApiKey,
          jobId,
        ));
        break;
      case 'failed':
        ({ status, progress, failedReason } = this.handleFailedJob(job));
        break;
      case 'active':
      case 'waiting':
      case 'delayed':
      default:
        ({ status, progress, result } = await this.handleInProgressJob(
          progress,
          userApiKey,
          jobId,
        ));
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

  /**
   * 完了したジョブの処理
   */
  private async handleCompletedJob(
    job: any,
    userApiKey: string,
    jobId: string,
  ): Promise<{
    status: JobStatusEnum;
    progress: number;
    result: ManagedDIDDto | undefined;
  }> {
    // Always check current DID status for completed jobs
    try {
      const currentDid = await this.didService.findOne(userApiKey);
      if (currentDid?.status === 'PUBLISHED') {
        return {
          status: JobStatusEnum.COMPLETED,
          progress: 100,
          result: currentDid,
        };
      } else {
        // Job completed but DID not yet published, treat as in-progress
        return {
          status: JobStatusEnum.IN_PROGRESS,
          progress: 75,
          result: currentDid || undefined,
        };
      }
    } catch (error) {
      this.logger.warn(
        `Failed to check DID status for completed job ${jobId}: ${error}`,
      );
      return {
        status: JobStatusEnum.COMPLETED,
        progress: 100,
        result: job.returnvalue,
      };
    }
  }

  /**
   * 失敗したジョブの処理
   */
  private handleFailedJob(job: any): {
    status: JobStatusEnum;
    progress: number;
    failedReason: ErrorResponseDto | undefined;
  } {
    let failedReason: ErrorResponseDto | undefined = undefined;

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

    return {
      status: JobStatusEnum.FAILED,
      progress: (job.progress as number) || 0,
      failedReason,
    };
  }

  /**
   * 進行中ジョブの処理
   */
  private async handleInProgressJob(
    progress: number,
    userApiKey: string,
    jobId: string,
  ): Promise<{
    status: JobStatusEnum;
    progress: number;
    result: ManagedDIDDto | undefined;
  }> {
    let status = JobStatusEnum.IN_PROGRESS;
    let result: ManagedDIDDto | undefined = undefined;

    // If job is at 75% progress, check if DID is now published
    if (progress >= 75) {
      try {
        const currentDid = await this.didService.findOne(userApiKey);
        if (currentDid?.status === 'PUBLISHED') {
          status = JobStatusEnum.COMPLETED;
          progress = 100;
          result = currentDid;
        } else {
          result = currentDid || undefined;
        }
      } catch (error) {
        this.logger.warn(
          `Failed to check DID status for job ${jobId}: ${error}`,
        );
      }
    }

    return { status, progress, result };
  }
}
