import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { VcConnectionlessService } from '../vc.connectionless.service';
import type { ErrorResponseDto } from '../../../../common/dto/error-response.dto';
import { AxiosError } from 'axios';
import type { IssueCredentialRecordDto } from '../../dto/identus';
import { VCProtocolState } from '../../dto/identus';
import type { IssueToHolderRequestDto } from '../../dto/job/issue-to-holder.dto';
import { DidService } from '../../../did/did.service';
import { DIDStatus } from '../../../did/dto/identus/did-status.dto';
import { identusConfig } from '../../../../config';
import type { ConfigType } from '@nestjs/config';

export interface IssueToHolderJobData {
  claims: Record<string, any>;
  holderApiKey: string;
}

@Processor('issue-to-holder-connectionless')
export class IssueToHolderProcessor extends WorkerHost {
  private readonly logger = new Logger(IssueToHolderProcessor.name);

  constructor(
    @Inject(identusConfig.KEY)
    private readonly identusConf: ConfigType<typeof identusConfig>,
    private readonly vcConnectionlessService: VcConnectionlessService,
    private readonly didService: DidService,
  ) {
    super();
  }

  async process(
    job: Job<IssueToHolderJobData>,
  ): Promise<IssueCredentialRecordDto> {
    const { claims, holderApiKey } = job.data;

    try {
      // Step 1: Find Issuer DID (12.5% progress)
      await job.updateProgress(0);
      this.logger.log(`Job ${job.id}: Checking for existing Issuer DID`);
      const issuerDid = await this.didService.getIssuerDid();
      if (
        !issuerDid ||
        !issuerDid.did ||
        issuerDid.status !== DIDStatus.PUBLISHED
      ) {
        this.logger.log(`Job ${job.id}: Issuer DID not found or not published`);
        throw new Error('Issuer DID not found or not published');
      }
      await job.updateProgress(12.5);

      // Step 2: Find Holder DID (25% progress)
      this.logger.log(`Job ${job.id}: Checking for existing Holder DID`);
      const holderDid = await this.didService.findOne(holderApiKey);
      if (
        !holderDid ||
        !holderDid.did ||
        holderDid.status !== DIDStatus.PUBLISHED
      ) {
        this.logger.log(`Job ${job.id}: Holder DID not found or not published`);
        throw new Error('Holder DID not found or not published');
      }
      await job.updateProgress(25);

      // Step 3: Issuer creates VC offer (37.5% progress)
      this.logger.log(`Job ${job.id}: Step 3 - Creating VC Offer`);
      const issuerRecord =
        await this.vcConnectionlessService.issuerCreateVcOffer(claims);
      this.logger.log(
        `Job ${job.id}: VC Offer created: ${issuerRecord.recordId}`,
      );
      if (!issuerRecord.invitation?.invitationUrl) {
        this.logger.log(`Job ${job.id}: No invitation URL in response`);
        throw new Error('No invitation URL in response');
      }
      await job.updateProgress(37.5);

      // Step 4: Holder accepts invitation (50% progress)
      this.logger.log(`Job ${job.id}: Step 4 - Accepting invitation as Holder`);
      const oobCode = issuerRecord.invitation.invitationUrl.split('_oob=')[1];
      const holderRecord =
        await this.vcConnectionlessService.holderAcceptInvitation(
          oobCode,
          holderApiKey,
        );
      this.logger.log(
        `Job ${job.id}: Invitation accepted: ${holderRecord.recordId}`,
      );
      await job.updateProgress(50);

      // Step 5: Holder accepts VC offer (62.5% progress)
      this.logger.log(`Job ${job.id}: Step 5 - Accepting VC offer as Holder`);

      // Wait until the offer is actually received on the Holder side
      this.logger.log(
        `Job ${job.id}: Waiting for OfferReceived on Holder before accepting offer`,
      );
      await this.vcConnectionlessService.waitForState(
        holderRecord.recordId,
        VCProtocolState.OFFER_RECEIVED,
        holderApiKey,
      );

      const updatedHolderRecord =
        await this.vcConnectionlessService.holderAcceptOffer(
          holderRecord.recordId,
          holderDid.did,
          holderApiKey,
        );
      this.logger.log(`Job ${job.id}: Offer accepted successfully`);
      await job.updateProgress(62.5);

      // Fallback: If automatic issuance is not triggered by the Issuer,
      // wait for Issuer side to reach RequestReceived and then issue manually.
      try {
        const issuerApiKey = this.identusConf.issuerApiKey!;
        this.logger.log(
          `Job ${job.id}: Checking Issuer record state for manual issuance if needed`,
        );

        for (let i = 0; i < 10; i++) {
          const issuerRecordState =
            await this.vcConnectionlessService.findOneByRecordId(
              issuerRecord.recordId,
              issuerApiKey,
            );

          this.logger.log(
            `Job ${job.id}: [${i + 1}/10] Issuer state: ${issuerRecordState.protocolState}`,
          );

          if (
            issuerRecordState.protocolState ===
            VCProtocolState.REQUEST_RECEIVED
          ) {
            this.logger.log(
              `Job ${job.id}: Issuer reached RequestReceived. Triggering manual issue-credential`,
            );
            await this.vcConnectionlessService.issuerIssueCredential(
              issuerRecord.recordId,
            );
            break;
          }

          if (
            issuerRecordState.protocolState ===
              VCProtocolState.CREDENTIAL_GENERATED ||
            issuerRecordState.protocolState === VCProtocolState.CREDENTIAL_SENT
          ) {
            this.logger.log(
              `Job ${job.id}: Credential already generated/sent by Issuer. Skipping manual issuance`,
            );
            break;
          }

          if (i < 9) {
            await new Promise((r) => setTimeout(r, 3000));
          }
        }
      } catch (e) {
        this.logger.warn(
          `Job ${job.id}: Manual issuance check failed: ${(e as Error).message}`,
        );
      }

      // Step 6: Wait for credential reception (75% progress)
      this.logger.log(
        `Job ${job.id}: Step 6 - Waiting for credential reception`,
      );
      const finalHolderRecord = await this.vcConnectionlessService.waitForState(
        updatedHolderRecord.recordId,
        VCProtocolState.CREDENTIAL_RECEIVED,
        holderApiKey,
      );
      await job.updateProgress(87.5);

      // Step 7: Get final issuer record (100% progress)
      this.logger.log(
        `Job ${job.id}: Step 7 - Getting final credential record`,
      );

      const issuerApiKey = this.identusConf.issuerApiKey;

      const finalIssuerRecord =
        await this.vcConnectionlessService.findOneByRecordId(
          issuerRecord.recordId,
          issuerApiKey!,
        );
      this.logger.log(`Job ${job.id}: Complete VC flow finished successfully`);
      await job.updateProgress(100);

      return finalHolderRecord;
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
      if (axiosError.response?.data && typeof axiosError.response.data === 'object' && 'status' in axiosError.response.data) {
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
