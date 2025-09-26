import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DidService } from '../did.service';
import { ErrorResponseDto } from '../../../common/dto/error-response.dto';
import { AxiosError } from 'axios';
import { DIDStatus } from '../dto/identus/did-status.dto';

export interface CreateAndPublishJobData {
  userApiKey: string;
}

@Processor('create-and-publish')
export class CreateAndPublishProcessor extends WorkerHost {
  private readonly logger = new Logger(CreateAndPublishProcessor.name);

  constructor(private readonly didService: DidService) {
    super();
  }

  async process(job: Job<CreateAndPublishJobData>): Promise<any> {
    const { userApiKey } = job.data;

    this.logger.log(
      `Processing create-and-publish job ${job.id} for userApiKey: ${userApiKey}`,
    );

    try {
      // Step 1: Find existing DID (25% progress)
      await job.updateProgress(25);
      this.logger.log(`Job ${job.id}: Checking for existing DID`);

      let existingDid = await this.didService.findOne(userApiKey);

      if (existingDid) {
        this.logger.log(
          `Job ${job.id}: Found existing DID with status: ${existingDid.status}`,
        );

        switch (existingDid.status) {
          case DIDStatus.PUBLISHED:
            await job.updateProgress(100);
            this.logger.log(
              `Job ${job.id}: DID already published, job complete`,
            );
            return existingDid;

          case DIDStatus.PUBLICATION_PENDING:
            await job.updateProgress(75);
            this.logger.log(
              `Job ${job.id}: DID publication pending, job at 75%`,
            );
            return existingDid;

          case DIDStatus.CREATED:
            // Continue to publish step
            this.logger.log(
              `Job ${job.id}: DID created, proceeding to publish`,
            );
            break;

          default:
            this.logger.warn(
              `Job ${job.id}: Unexpected DID status: ${existingDid.status}`,
            );
            break;
        }
      } else {
        // Step 2: Create DID (50% progress)
        await job.updateProgress(50);
        this.logger.log(`Job ${job.id}: Creating new DID`);

        const createdDid = await this.didService.create(userApiKey);
        this.logger.log(
          `Job ${job.id}: DID created: ${createdDid.longFormDid}`,
        );

        // Get the created DID details
        existingDid = await this.didService.findOneByLongFormDid(
          userApiKey,
          createdDid.longFormDid,
        );
      }

      // Step 3: Publish DID (75% progress)
      if (existingDid && existingDid.status === DIDStatus.CREATED) {
        await job.updateProgress(75);
        this.logger.log(`Job ${job.id}: Publishing DID: ${existingDid.did}`);

        await this.didService.publish(userApiKey, existingDid.did);

        // Get updated DID status
        const publishedDid = await this.didService.findOneByLongFormDid(
          userApiKey,
          existingDid.did,
        );
        this.logger.log(
          `Job ${job.id}: DID published with status: ${publishedDid.status}`,
        );

        return publishedDid;
      }

      return existingDid;
    } catch (error) {
      this.logger.error(
        `Job ${job.id} failed: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Create ErrorResponseDto from the caught error
      const errorResponse: ErrorResponseDto = this.createErrorResponse(error);

      // Throw the error with structured format
      throw new Error(JSON.stringify(errorResponse));
    }
  }

  private createErrorResponse(error: unknown): ErrorResponseDto {
    if (this.isAxiosError(error)) {
      const axiosError = error;

      // If Identus returned structured error, use it
      if (axiosError.response?.data) {
        return axiosError.response.data as ErrorResponseDto;
      }

      // Otherwise create standard error response
      return {
        status: axiosError.response?.status || 500,
        type: '/errors/identus-api-error',
        title: 'Identus API Error',
        detail: axiosError.message,
        instance: axiosError.config?.url,
      };
    }

    // Handle other errors
    return {
      status: 500,
      type: '/errors/internal-server-error',
      title: 'Internal Server Error',
      detail:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }

  private isAxiosError(error: unknown): error is AxiosError {
    return (
      error instanceof Error &&
      'isAxiosError' in error &&
      (error as any).isAxiosError === true
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} completed successfully`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(`Job ${job.id} failed with error: ${err.message}`);
  }
}
