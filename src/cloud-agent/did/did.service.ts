import { Injectable, Inject, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import identusConfig from '../../config/identus.config';
import axios from 'axios';
import {
  ManagedDIDDto,
  CreateManagedDIDResponseDto,
  ManagedDIDPageDto,
  DidOperationSubmissionDto,
} from './dto/identus';
import { DIDStatus } from './dto/identus/did-status.dto';

@Injectable()
export class DidService {
  private readonly logger = new Logger(DidService.name);

  constructor(
    @Inject(identusConfig.KEY)
    private readonly identusConf: ConfigType<typeof identusConfig>,
  ) {}

  /**
   * APIキーからユーザーのDIDを取得
   * 基本的に1ユーザー1DIDの前提で、先頭のDIDを返す
   * @param apiKey APIキー
   */
  async findOne(apiKey: string): Promise<ManagedDIDDto | null> {
    try {
      const url = `${this.identusConf.cloudAgentUrl}/did-registrar/dids`;

      this.logger.log(`ユーザーDID取得リクエスト - URL: ${url}`);

      // ページネーションは使用せず、最大1件だけ取得する設定
      const { data } = await axios.get<ManagedDIDPageDto>(url, {
        headers: { apikey: apiKey },
        params: { offset: 0, limit: 1 },
      });

      // 結果があればDIDを返す、なければnull
      if (data.contents && data.contents.length > 0) {
        this.logger.log(`ユーザーDID取得成功: ${data.contents[0].did}`);

        // TODO: ここの正しい解決策を探す
        // もしPUBLISH_PENDINGの場合、キャッシュを返すことがあるので、個別クエリで再確認する
        if (data.contents[0].status === DIDStatus.PUBLICATION_PENDING) {
          this.logger.log('PUBLICATION_PENDINGの場合、個別クエリで再確認する');
          const did = await this.findOneByLongFormDid(
            apiKey,
            data.contents[0].longFormDid!,
          );
          return did;
        }

        return data.contents[0];
      } else {
        this.logger.log('ユーザーのDIDが存在しません');
        return null;
      }
    } catch (error) {
      this.logger.error(
        `ユーザーDID取得エラー: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  /**
   * longFormDidからDIDのステータスを取得
   *
   * @param apiKey APIキー
   * @param longFormDid 取得するDIDの参照（did:prism:...形式）
   * @returns DIDの詳細情報
   */
  async findOneByLongFormDid(
    apiKey: string,
    longFormDid: string,
  ): Promise<ManagedDIDDto> {
    try {
      const url = `${this.identusConf.cloudAgentUrl}/did-registrar/dids/${longFormDid}`;

      this.logger.log(
        `特定DID取得リクエスト - DID: ${longFormDid}, URL: ${url}`,
      );

      const { data } = await axios.get<ManagedDIDDto>(url, {
        headers: { apikey: apiKey },
      });

      this.logger.log(`DID取得成功: ${longFormDid}`);
      return data;
    } catch (error) {
      this.logger.error(
        `DID取得エラー: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  /**
   * PRISM DIDを作成し、エージェントのウォレットに保存する
   * 公開鍵テンプレートはサーバー側で固定
   * @param apiKey APIキー
   */
  async create(apiKey: string): Promise<CreateManagedDIDResponseDto> {
    try {
      const url = `${this.identusConf.cloudAgentUrl}/did-registrar/dids`;

      // 固定のテンプレートを使用
      const createDidRequest = {
        documentTemplate: {
          publicKeys: [
            {
              id: 'key-1',
              purpose: 'authentication',
              curve: 'Ed25519',
            },
            {
              id: 'key-2',
              purpose: 'assertionMethod',
              curve: 'Ed25519',
            },
          ],
          services: [
            {
              id: 'service-1',
              type: 'LinkedDomains',
              serviceEndpoint: 'https://kyosodao.io',
            },
          ],
          contexts: [],
        },
      };

      this.logger.log('DID作成リクエスト - 標準テンプレート使用');

      this.logger.debug('url', url);
      this.logger.debug('apiKey', apiKey);
      this.logger.debug('createDidRequest', createDidRequest);

      const { data } = await axios.post<{ longFormDid: string }>(
        url,
        createDidRequest,
        {
          headers: { apikey: apiKey },
        },
      );

      this.logger.log(`DID作成成功: ${data.longFormDid}`);

      return data;
    } catch (error) {
      this.logger.error(
        `DID作成エラー: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  /**
   * エージェントのウォレットに保存されているDIDをVDRに公開する
   *
   * 公開プロセスは非同期で行われ、同じDIDに対して進行中の公開がある場合は新たな公開は開始されない。
   * DID公開の提出後、ステータスは「PUBLICATION_PENDING」に変更される。
   * 所定のブロック数の確認後、ステータスは「PUBLISHED」に変更される。
   * DID公開が失敗した場合、ステータスは「CREATED」に戻される。
   *
   * @param apiKey APIキー
   * @param longFormDid 公開するDIDの参照（did:prism:...形式）
   * @returns DID操作の予約情報
   */
  async publish(
    apiKey: string,
    longFormDid: string,
  ): Promise<DidOperationSubmissionDto> {
    try {
      const url = `${this.identusConf.cloudAgentUrl}/did-registrar/dids/${longFormDid}/publications`;

      this.logger.log(`DID公開リクエスト - DID: ${longFormDid}, URL: ${url}`);

      const { data, status } = await axios.post<DidOperationSubmissionDto>(
        url,
        {}, // 空のボディ
        {
          headers: { apikey: apiKey },
        },
      );

      this.logger.log(
        `DID公開リクエスト成功 - ステータスコード: ${status}, DID: ${longFormDid}, 操作ID: ${data.scheduledOperation.id}`,
      );

      return data;
    } catch (error) {
      this.logger.error(
        `DID公開エラー: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  async getIssuerDid(): Promise<ManagedDIDDto> {
    try {
      let existingDid = await this.findOne(this.identusConf.issuerApiKey!);

      if (existingDid) {
        this.logger.log(
          `Found existing Issuer DID with status: ${existingDid.status}`,
        );

        this.logger.debug('existingDid', existingDid);

        switch (existingDid.status) {
          case DIDStatus.PUBLISHED:
            this.logger.log(`Issuer DID already published`);
            return existingDid;

          case DIDStatus.PUBLICATION_PENDING:
            this.logger.log(`Issuer DID publication pending`);
            return existingDid;

          case DIDStatus.CREATED:
            // Continue to publish step
            this.logger.log(`Issuer DID created, proceeding to publish`);
            break;

          default:
            this.logger.warn(
              `Unexpected Issuer DID status: ${existingDid.status}`,
            );
            break;
        }
      } else {
        // Step 2: Create DID (50% progress)
        this.logger.log(`Creating new Issuer DID`);

        const createdDid = await this.create(this.identusConf.issuerApiKey!);
        this.logger.log(`Issuer DID created: ${createdDid.longFormDid}`);

        // Get the created DID details
        existingDid = await this.findOneByLongFormDid(
          this.identusConf.issuerApiKey!,
          createdDid.longFormDid,
        );
      }

      // Step 3: Publish DID (75% progress)
      if (existingDid && existingDid.status === DIDStatus.CREATED) {
        this.logger.log(`Publishing Issuer DID: ${existingDid.did}`);

        await this.publish(this.identusConf.issuerApiKey!, existingDid.did);

        // Get updated DID status
        const publishedDid = await this.findOneByLongFormDid(
          this.identusConf.issuerApiKey!,
          existingDid.did,
        );
        this.logger.log(
          `Issuer DID published with status: ${publishedDid.status}`,
        );

        return publishedDid;
      }

      return existingDid;
    } catch (error) {
      this.logger.error(
        `Issuer DID creation and publication failed: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
  /**
   * longFormDIDからshortFormDIDを抽出
   */
  extractShortFormDid(longFormDid: string): string {
    return longFormDid.split(':').slice(0, 3).join(':');
  }
}
