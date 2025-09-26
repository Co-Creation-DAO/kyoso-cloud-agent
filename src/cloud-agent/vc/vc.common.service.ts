import { Injectable, Logger, Inject } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import type {
  IssueCredentialRecordDto,
  AcceptCredentialOfferRequestDto,
  VCProtocolState,
  IssueCredentialRecordPageDto,
} from './dto/identus';
import { identusConfig } from '../../config';
import { DidService } from '../did/did.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class VcCommonService {
  protected readonly logger = new Logger(VcCommonService.name);

  constructor(
    @Inject(identusConfig.KEY)
    protected readonly identusConf: ConfigType<typeof identusConfig>,
    protected readonly didService: DidService,
    protected readonly httpService: HttpService,
  ) {}

  /**
   * VC交換レコードの一覧を取得する
   * @param apiKey API Key（Issuer or Holder）
   * @returns レコードリスト
   */
  async findAll(apiKey: string): Promise<IssueCredentialRecordPageDto> {
    try {
      const url = `${this.identusConf.cloudAgentUrl}/issue-credentials/records`;
      const response$ = this.httpService.get<IssueCredentialRecordPageDto>(
        url,
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
        `VCレコード一覧取得エラー: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  /**
   * VC交換レコードの状態を取得する
   * @param recordId レコードID
   * @param apiKey API Key（Issuer or Holder）
   * @returns レコード情報
   */
  async findOneByRecordId(
    recordId: string,
    apiKey: string,
  ): Promise<IssueCredentialRecordDto> {
    try {
      const url = `${this.identusConf.cloudAgentUrl}/issue-credentials/records/${recordId}`;
      const response$ = this.httpService.get<IssueCredentialRecordDto>(url, {
        headers: {
          apikey: apiKey,
          'Content-Type': 'application/json',
        },
      });
      const response = await firstValueFrom(response$);
      return response.data;
    } catch (error) {
      this.logger.error(
        `VCレコード取得エラー: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  /**
   * 指定した状態になるまで待機する（ポーリング）
   * @param recordId レコードID
   * @param targetState 待機する目標状態
   * @param apiKey API Key
   * @param maxRetries 最大リトライ回数
   * @param intervalMs ポーリング間隔（ミリ秒）
   * @returns 目標状態に達したレコード情報
   */
  async waitForState(
    recordId: string,
    targetState: VCProtocolState,
    apiKey: string,
    maxRetries: number = 20,
    intervalMs: number = 3000,
  ): Promise<IssueCredentialRecordDto> {
    for (let i = 0; i < maxRetries; i++) {
      const record = await this.findOneByRecordId(recordId, apiKey);
      this.logger.log(
        `[${i + 1}/${maxRetries}] Record ${recordId} state: ${record.protocolState}`,
      );

      if (record.protocolState === targetState) {
        this.logger.log(`✅ Target state ${targetState} reached!`);
        return record;
      }

      if (i < maxRetries - 1) {
        await this.sleep(intervalMs);
      }
    }

    throw new Error(
      `Timeout waiting for state ${targetState} on record ${recordId}`,
    );
  }

  /**
   * HolderがVC Offerを受け入れる（ステップ5）
   * @param recordId Holder側のレコードID
   * @param subjectId HolderのDID（Long-form推奨）
   * @param apiKey Holder API Key
   * @returns 更新されたレコード情報
   */
  async holderAcceptOffer(
    recordId: string,
    subjectId: string,
    apiKey: string,
  ): Promise<IssueCredentialRecordDto> {
    try {
      const request: AcceptCredentialOfferRequestDto = {
        subjectId,
      };

      const url = `${this.identusConf.cloudAgentUrl}/issue-credentials/records/${recordId}/accept-offer`;
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
        `Holder VC Offer受け入れエラー: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  /**
   * Issuer側でCredentialを発行する（Manual Issuance用）
   * @param recordId Issuer側のレコードID
   * @returns 発行後のレコード情報
   */
  async issuerIssueCredential(
    recordId: string,
  ): Promise<IssueCredentialRecordDto> {
    try {
      const url = `${this.identusConf.cloudAgentUrl}/issue-credentials/records/${recordId}/issue-credential`;
      const response$ = this.httpService.post<IssueCredentialRecordDto>(
        url,
        {},
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
      this.logger.error(
        `Issuer Credential発行エラー: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
