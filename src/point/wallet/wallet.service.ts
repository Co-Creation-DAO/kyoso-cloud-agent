import { Injectable, Logger, HttpException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bip39 from 'bip39';
import { BlockfrostProvider, MeshTxBuilder, MeshWallet, UTxO, Asset } from '@meshsdk/core';
import { MetadataResponseDto } from './dto/metadata-response.dto';
import transactionConfig from '../../config/transaction.config';
import type { ConfigType } from '@nestjs/config';
@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);
  private provider: BlockfrostProvider;
  private mnemonic: string;
  private wallet: MeshWallet;

  constructor(
    @Inject(transactionConfig.KEY)
    private readonly transactionConf: ConfigType<typeof transactionConfig>,
  ) {
    // Blockfrost Provider初期化
    const projectId = this.transactionConf.blockfrostProjectId;

    // MeshJS BlockfrostProviderを使用
    this.provider = new BlockfrostProvider(projectId);

    // Mnemonic検証
    const rawMnemonic = this.transactionConf.walletMnemonic;
    if (!rawMnemonic || !bip39.validateMnemonic(rawMnemonic.trim())) {
      throw new HttpException('MNEMONIC が不正です', 500);
    }
    this.mnemonic = rawMnemonic.trim().replace(/\s+/g, ' ');

    this.logger.log('🔑 Wallet service initialized with MeshJS');

    const words = this.mnemonic.split(' ');

    this.wallet = new MeshWallet({
      networkId: 0, // preprod
      fetcher: this.provider,
      submitter: this.provider,
      key: { type: 'mnemonic', words },
    });
  }

  /**
   * Change addressを取得
   * @returns {Promise<string>} change address
   */
  async getChangeAddress(): Promise<string> {
    try {
      const changeAddress = await this.wallet.getChangeAddress();
      this.logger.log(`📍 Change address: ${changeAddress}`);
      return changeAddress;
    } catch (error) {
      this.logger.error('Failed to get change address:', error);
      throw new HttpException('Change address取得に失敗しました', 500);
    }
  }

  /**
   * ウォレットの残高を取得
   * @returns {Promise<Asset[]>} 残高の配列
   */
  async getBalance(): Promise<Asset[]> {
    try {
      const balance = await this.wallet.getBalance();
      const lovelace = balance.find(b => b.unit === 'lovelace');
      if (lovelace) {
        const ada = (Number(lovelace.quantity) / 1_000_000).toFixed(6);
        this.logger.log(`💰 Balance: ${ada} ADA (${lovelace.quantity} lovelace)`);
      }
      return balance;
    } catch (error) {
      this.logger.error('Failed to get balance:', error);
      throw new HttpException('残高取得に失敗しました', 500);
    }
  }

  /**
   * ウォレットのUTxOを取得
   * @returns {Promise<UTxO[]>} UTxOの配列
   */
  async getUtxos(): Promise<UTxO[]> {
    try {
      const utxos = await this.wallet.getUtxos();
      this.logger.log(`📦 Found ${utxos.length} UTxOs`);
      return utxos;
    } catch (error) {
      this.logger.error('Failed to get UTxOs:', error);
      throw new HttpException('UTxO取得に失敗しました', 500);
    }
  }

  /**
   * コラテラルを取得
   * @returns {Promise<UTxO[]>} コラテラル用UTxOの配列
   */
  async getCollateral(): Promise<UTxO[]> {
    try {
      const collateral = await this.wallet.getCollateral();
      this.logger.log(`🔒 Found ${collateral.length} collateral UTxOs`);
      return collateral;
    } catch (error) {
      this.logger.error('Failed to get collateral:', error);
      throw new HttpException('コラテラル取得に失敗しました', 500);
    }
  }

  /**
   * メタデータ付きトランザクションを構築して送信
   * @param {number} label - メタデータラベル
   * @param {any} metadata - メタデータ内容
   * @returns {Promise<string>} トランザクションハッシュ
   */
  async commitMetadata(label: number, metadata: any): Promise<string> {
    try {
      const changeAddress = await this.getChangeAddress();

      // 最新のUTXOを取得（キャッシュを回避）
      const utxos = await this.wallet.getUtxos();

      if (utxos.length === 0) {
        throw new HttpException('利用可能なUTxOがありません', 400);
      }

      // 最大のUTXOを選択（安全のため）
      const sortedUtxos = utxos.sort((a, b) => {
        const aLovelace = Number(a.output.amount.find(asset => asset.unit === 'lovelace')?.quantity || 0);
        const bLovelace = Number(b.output.amount.find(asset => asset.unit === 'lovelace')?.quantity || 0);
        return bLovelace - aLovelace; // 降順（最大から）
      });

      // 十分な残高があるUTXOを選択（最低5 ADA）
      const selectedUtxo = sortedUtxos.find(utxo => {
        const lovelace = Number(utxo.output.amount.find(asset => asset.unit === 'lovelace')?.quantity || 0);
        return lovelace >= 5_000_000; // 5 ADA以上
      });

      if (!selectedUtxo) {
        throw new HttpException('十分な残高を持つUTxOがありません（最低5 ADA必要）', 400);
      }

      this.logger.log(`📍 Selected UTxO: ${selectedUtxo.input.txHash}#${selectedUtxo.input.outputIndex}`);
      const lovelace = Number(selectedUtxo.output.amount.find(asset => asset.unit === 'lovelace')?.quantity || 0);
      this.logger.log(`💰 UTxO amount: ${lovelace} lovelace`);

      // TxBuilderを使ってトランザクション構築
      const txBuilder = new MeshTxBuilder({
        fetcher: this.provider,
        verbose: true, // デバッグのため一時的にtrue
      });

      const unsignedTx = await txBuilder
        .txIn(
          selectedUtxo.input.txHash,
          selectedUtxo.input.outputIndex,
          selectedUtxo.output.amount,
          selectedUtxo.output.address
        )
        .txOut(changeAddress, [])
        .metadataValue(label.toString(), metadata)
        .changeAddress(changeAddress)
        .complete();

      this.logger.log('📝 Transaction built with metadata');

      // 署名
      const signedTx = await this.wallet.signTx(unsignedTx);
      this.logger.log('✅ Transaction signed');

      // 送信
      const txHash = await this.wallet.submitTx(signedTx);
      this.logger.log(`🚀 Transaction submitted: ${txHash}`);

      return txHash;
    } catch (error) {
      this.logger.error('Failed to commit metadata:', error);
      if (error instanceof HttpException) throw error;
      throw new HttpException('メタデータコミットに失敗しました', 500);
    }
  }

  /**
   * トランザクション確認を待つ
   * @param {string} txHash - トランザクションハッシュ
   * @param {number} maxAttempts - 最大試行回数
   * @param {number} delayMs - 試行間隔（ミリ秒）
   * @returns {Promise<boolean>} 確認成功の場合true
   */
  async waitForTransactionConfirmation(
    txHash: string,
    maxAttempts: number = 60,
    delayMs: number = 5000
  ): Promise<boolean> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const txInfo = await this.provider.fetchTxInfo(txHash);
        if (txInfo && txInfo.block) {
          this.logger.log(`✅ Transaction ${txHash} confirmed in block ${txInfo.block}`);
          return true;
        }
      } catch (error) {
        // トランザクションがまだチェーン上にない
        this.logger.debug(`⏳ Waiting for confirmation (${attempt + 1}/${maxAttempts})`);
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    this.logger.warn(`⚠️ Transaction ${txHash} confirmation timeout`);
    return false;
  }

  /**
   * メタデータを取得
   * @param {string} txHash - トランザクションハッシュ
   * @returns {Promise<any>} メタデータ
   */
  async getMetadata(txHash: string): Promise<MetadataResponseDto> {
    const projectId = this.transactionConf.blockfrostProjectId;

    const metadata = await fetch(`https://cardano-preprod.blockfrost.io/api/v0/txs/${txHash}/metadata`, {
        headers: {
            'project_id': projectId!
        }   
    });
    const metadataJson = await metadata.json();
    const response: MetadataResponseDto = {
      txHash: txHash,
      label: metadataJson[0].label,
      json_metadata: metadataJson[0].json_metadata
    };
    return response;
  }
}