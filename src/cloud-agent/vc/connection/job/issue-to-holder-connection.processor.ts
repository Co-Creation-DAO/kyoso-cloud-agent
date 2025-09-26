import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { VcConnectionService } from '../../connection/vc.connection.service';
import type { ErrorResponseDto } from '../../../../common/dto/error-response.dto';
import { AxiosError } from 'axios';
import type { IssueCredentialRecordDto } from '../../dto/identus';
import { VCProtocolState } from '../../dto/identus';
import type { IssueToHolderRequestDto } from '../../dto/job/issue-to-holder.dto';
import { DidService } from '../../../did/did.service';
import { DIDStatus } from '../../../did/dto/identus/did-status.dto';
import { identusConfig } from '../../../../config';
import type { ConfigType } from '@nestjs/config';
import axios from 'axios';
import { ConnectionService } from '../../../connection/connection.service';
import { ConnectionProtocolState } from '../../../connection/dto/identus/connection.dto';

export interface IssueToHolderConnectionJobData {
  claims: Record<string, any>;
  holderApiKey: string;
}

@Processor('issue-to-holder-connection')
export class IssueToHolderConnectionProcessor extends WorkerHost {
  private readonly logger = new Logger(IssueToHolderConnectionProcessor.name);

  constructor(
    @Inject(identusConfig.KEY)
    private readonly identusConf: ConfigType<typeof identusConfig>,
    private readonly vcConnectionService: VcConnectionService,
    private readonly didService: DidService,
    private readonly connectionService: ConnectionService,
  ) {
    super();
  }

  async process(
    job: Job<IssueToHolderConnectionJobData>,
  ): Promise<IssueCredentialRecordDto> {
    const { claims, holderApiKey } = job.data;

    try {
      await job.updateProgress(0);
      this.logger.log(`Job ${job.id}: Checking Issuer DID`);
      const issuerApiKey = this.identusConf.issuerApiKey!;
      const issuerDid = await this.didService.getIssuerDid();
      if (
        !issuerDid ||
        !issuerDid.did ||
        issuerDid.status !== DIDStatus.PUBLISHED
      ) {
        throw new Error('Issuer DID not found or not published');
      }
      await job.updateProgress(10);

      this.logger.log(`Job ${job.id}: Checking Holder DID`);
      const holderDid = await this.didService.findOne(holderApiKey);
      if (
        !holderDid ||
        !holderDid.did ||
        holderDid.status !== DIDStatus.PUBLISHED
      ) {
        throw new Error('Holder DID not found or not published');
      }
      await job.updateProgress(20);

      // Create connection (Issuer)

      // this.logger.log(`Job ${job.id}: Creating connection (Issuer)`);
      // const connRes = await axios.post(
      //   `${this.identusConf.cloudAgentUrl}/connections`,
      //   { label: 'Kyoso Issuer DIDComm' },
      //   { headers: { apikey: this.identusConf.issuerApiKey, 'Content-Type': 'application/json' } },
      // );
      // if (connRes.status !== 201) {
      //   throw new Error(`Failed to create connection: ${connRes.status}`);
      // }
      // const connectionId: string = connRes.data.connectionId;
      // const invitationUrl: string | undefined = connRes.data.invitation?.invitationUrl;
      // if (!invitationUrl) {
      //   throw new Error('Connection invitation URL missing');
      // }

      this.logger.log(`Job ${job.id}: Creating connection (Issuer)`);
      const createConnResponse = await this.connectionService.create(
        { label: 'VC Issuance Connection' },
        issuerApiKey,
      );
      const connectionId = createConnResponse.connectionId;
      const invitationUrl = createConnResponse.invitation?.invitationUrl;
      if (!invitationUrl) {
        throw new Error('Connection invitation URL missing');
      }

      this.logger.log(`Job ${job.id}: Connection created: ${connectionId}`);
      await job.updateProgress(30);

      // Holder accepts invitation
      this.logger.log(`Job ${job.id}: Holder accepting invitation`);
      const oobCode = invitationUrl.split('_oob=')[1];
      const acceptConnResponse = await this.connectionService.acceptInvitation(
        oobCode,
        holderApiKey,
      );
      this.logger.log(`Job ${job.id}: Holder accepted connection`);
      await job.updateProgress(40);

      // Wait for connection established (Issuer side polling)
      this.logger.log(`Job ${job.id}: Waiting for connection to establish`);
      let connectionEstablished = false;
      for (let i = 0; i < 10; i++) {
        await new Promise((resolve) => setTimeout(resolve, 3000));

        const connStatus = await this.connectionService.getConnectionById(
          connectionId,
          issuerApiKey,
        );

        if (
          connStatus.state === ConnectionProtocolState.CONNECTION_RESPONSE_SENT
        ) {
          connectionEstablished = true;
          break;
        }

        this.logger.log(
          `Job ${job.id}: Connection state: ${connStatus.state} (attempt ${i + 1}/10)`,
        );
      }

      if (!connectionEstablished) {
        throw new Error('Connection establishment timeout');
      }
      await job.updateProgress(50);
      // for (let i = 0; i < 20; i++) {
      //   await new Promise((r) => setTimeout(r, 3000));
      //   const status = await axios.get(
      //     `${this.identusConf.cloudAgentUrl}/connections/${connectionId}`,
      //     { headers: { apikey: this.identusConf.issuerApiKey } },
      //   );
      //   const state = status.data.state as string;
      //   if (state === 'ConnectionResponseSent') {
      //     break;
      //   }
      //   if (i === 19) {
      //     throw new Error('Connection not established in time');
      //   }
      // }
      await job.updateProgress(50);

      // Create VC offer via connection
      this.logger.log(`Job ${job.id}: Creating VC offer (connection mode)`);
      const issuerRecord = await this.vcConnectionService.issuerCreateVcOffer(
        connectionId,
        claims,
      );
      await job.updateProgress(60);

      // Find holder record in OfferReceived
      this.logger.log(`Job ${job.id}: Locating holder offer record`);
      let holderRecordId: string | null = null;
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        const page = await this.vcConnectionService.findAll(holderApiKey);
        const contents = page.contents || [];
        const found = contents.find(
          (r) =>
            r.protocolState === VCProtocolState.OFFER_RECEIVED &&
            r.thid === issuerRecord.thid,
        );
        if (found) {
          holderRecordId = found.recordId;
          break;
        }
      }
      if (!holderRecordId) {
        throw new Error('Holder record in OfferReceived state not found');
      }
      await job.updateProgress(70);

      // Holder accepts offer
      this.logger.log(`Job ${job.id}: Holder accepting VC offer`);
      const updatedHolderRecord =
        await this.vcConnectionService.holderAcceptOffer(
          holderRecordId,
          holderDid.did,
          holderApiKey,
        );
      await job.updateProgress(80);

      // Wait for credential reception on holder
      this.logger.log(`Job ${job.id}: Waiting for CredentialReceived`);
      const finalHolderRecord = await this.vcConnectionService.waitForState(
        updatedHolderRecord.recordId,
        VCProtocolState.CREDENTIAL_RECEIVED,
        holderApiKey,
      );
      await job.updateProgress(90);

      // Optionally fetch issuer final record
      await this.vcConnectionService.findOneByRecordId(
        issuerRecord.recordId,
        this.identusConf.issuerApiKey!,
      );
      await job.updateProgress(100);

      return finalHolderRecord;
    } catch (error) {
      this.logger.error(`Job ${job.id} failed: ${(error as Error).message}`);
      const errorResponse: ErrorResponseDto = this.createErrorResponse(error);
      throw new Error(JSON.stringify(errorResponse));
    }
  }

  private createErrorResponse(error: unknown): ErrorResponseDto {
    if (this.isAxiosError(error)) {
      const axiosError = error;
      if (axiosError.response?.data) {
        return axiosError.response.data as ErrorResponseDto;
      }
      return {
        status: axiosError.response?.status || 500,
        type: '/errors/identus-api-error',
        title: 'Identus API Error',
        detail: axiosError.message,
        instance: axiosError.config?.url,
      };
    }
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
