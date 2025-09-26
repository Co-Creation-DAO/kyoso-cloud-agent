import { Injectable, Logger, Inject } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import type {
  IssueCredentialRecordDto,
  AcceptCredentialOfferInvitationDto,
  CreateIssueCredentialRecordRequestDto,
} from '../dto/identus';
import { DidService } from '../../did/did.service';
import { identusConfig } from '../../../config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import axios from 'axios';
import { VcCommonService } from '../vc.common.service';

@Injectable()
export class VcConnectionlessService extends VcCommonService {
  constructor(
    @Inject(identusConfig.KEY)
    identusConf: ConfigType<typeof identusConfig>,
    didService: DidService,
    httpService: HttpService,
  ) {
    super(identusConf, didService, httpService);
  }

  /**
   * IssuerがVC Offerを作成する（ステップ3）
   * @param claims 証明書に含める情報
   * @returns 証明書オファーの情報
   */
  async issuerCreateVcOffer(
    claims: Record<string, any>,
  ): Promise<IssueCredentialRecordDto> {
    try {
      const issuerDid = await this.didService.getIssuerDid();

      const request: CreateIssueCredentialRecordRequestDto = {
        claims: claims,
        credentialFormat: 'JWT',
        issuingDID: issuerDid.did,
        domain: 'kyosodao.io',
      };

      const url = `${this.identusConf.cloudAgentUrl}/issue-credentials/credential-offers/invitation`;
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

  /**
   * Holderが招待を受け入れる（ステップ4）
   * @param invitation Base64エンコードされた招待データ
   * @param apiKey Holder API Key
   * @returns 受け入れ後のレコード情報
   */
  async holderAcceptInvitation(
    invitation: string,
    apiKey: string,
  ): Promise<IssueCredentialRecordDto> {
    try {
      const request: AcceptCredentialOfferInvitationDto = {
        invitation,
      };

      const url = `${this.identusConf.cloudAgentUrl}/issue-credentials/credential-offers/accept-invitation`;
      const response$ = this.httpService.post<IssueCredentialRecordDto>(
        url,
        request,
        {
          headers: {
            apikey: apiKey,
            'Content-Type': 'application/json',
          },
        },
      );
      const response = await firstValueFrom(response$);
      return response.data;
    } catch (error) {
      this.logger.error(
        `Holder招待受け入れエラー: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
