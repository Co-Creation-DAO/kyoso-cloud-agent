import { Injectable, Logger, Inject } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import type {
  IssueCredentialRecordDto,
  AcceptCredentialOfferRequestDto,
  CreateIssueCredentialRecordRequestDto,
  VCProtocolState,
  IssueCredentialRecordPageDto,
} from '../dto/identus';
import { DidService } from '../../did/did.service';
import { identusConfig } from '../../../config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { VcCommonService } from '../vc.common.service';
import axios from 'axios';

@Injectable()
export class VcConnectionService extends VcCommonService {
  constructor(
    @Inject(identusConfig.KEY)
    identusConf: ConfigType<typeof identusConfig>,
    didService: DidService,
    httpService: HttpService,
  ) {
    super(identusConf, didService, httpService);
  }

  /**
   * 接続あり: IssuerがVC Offerを作成（/issue-credentials/credential-offers）
   * @param connectionId 既存のDIDComm接続ID
   * @param claims 証明書に含める情報
   */
  async issuerCreateVcOffer(
    connectionId: string,
    claims: Record<string, any>,
  ): Promise<IssueCredentialRecordDto> {
    try {
      const issuerDid = await this.didService.getIssuerDid();

      const request: CreateIssueCredentialRecordRequestDto = {
        connectionId,
        claims,
        credentialFormat: 'JWT',
        issuingDID: issuerDid.did,
        automaticIssuance: true,
      };

      const url = `${this.identusConf.cloudAgentUrl}/issue-credentials/credential-offers`;
      const response$ = this.httpService.post<IssueCredentialRecordDto>(
        url,
        request,
        {
          headers: {
            apikey: this.identusConf.issuerApiKey,
            'Content-Type': 'application/json',
          },
        },
      );
      const response = await firstValueFrom(response$);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.error(`Issuer VCオファー作成エラー: ${error.message}`, {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers,
          request: {
            url: error.config?.url,
            method: error.config?.method,
            data: error.config?.data,
          },
        });
      } else {
        this.logger.error(
          `Issuer VCオファー作成エラー: ${(error as Error).message}`,
          (error as Error).stack,
        );
      }
      throw error;
    }
  }
}
