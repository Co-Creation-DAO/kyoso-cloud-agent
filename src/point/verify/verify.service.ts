import { Injectable, Logger } from '@nestjs/common';
import { TransactionService } from '../transaction/transaction.service';
import { WalletService } from '../wallet/wallet.service';
import { MerkleService } from '../merkle/merkle.service';
import { VerifyResponseDto } from './dto/verify.dto';
import { VerifyStatus } from './dto/verify.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VerifyService {
    private readonly logger = new Logger(VerifyService.name);

    constructor(
      private readonly transactionService: TransactionService,
      private readonly walletService: WalletService,
      private readonly merkleService: MerkleService,
      private readonly prismaService: PrismaService,
    ) {}

    async verifyTxIds(txIds: string[]): Promise<VerifyResponseDto[]> {
      const results: VerifyResponseDto[] = [];

      for (const txId of txIds) {
        // 1. トランザクションを取得
        this.logger.log(`🔍 Verifying transaction: ${txId}`);
        const tx = await this.prismaService.withRlsContext(async (db) => {
          return this.transactionService.findTransactionById(txId, db);
        });
        if (!tx) {
          results.push({ txId, status: VerifyStatus.NOT_VERIFIED, transactionHash: '', rootHash: '', label: 0 });
          this.logger.warn(`Transaction not found: ${txId}`);
          continue;
        }

        // 2. トランザクションのMerkleプルーフを取得
        const proofs = await this.prismaService.withRlsContext(async (db) => {
          return this.transactionService.getProofsForTransaction(txId, db);
        });
        if (!proofs || proofs.length === 0) {
          results.push({ txId, status: VerifyStatus.NOT_VERIFIED, transactionHash: '', rootHash: '', label: 0 });
          this.logger.warn(`Proofs not found: ${txId}`);
          continue;
        }

        // 3. トランザクションのルートハッシュ情報を取得
        const rootHashData = await this.prismaService.withRlsContext(async (db) => {
          return this.transactionService.getRootHashForTransaction(txId, db);
        });
        if (!rootHashData) {
          results.push({ txId, status: VerifyStatus.NOT_VERIFIED, transactionHash: '', rootHash: '', label: 0 });
          this.logger.warn(`Root hash not found: ${txId}`);
          continue;
        }
        const { commitId, rootHash: dbRootHash } = rootHashData;

        // 4. オンチェーンのメタデータを取得
        const onchainMetadata = await this.walletService.getMetadata(commitId);
        if (!onchainMetadata) {
          results.push({ txId, status: VerifyStatus.NOT_VERIFIED, transactionHash: '', rootHash: '', label: 0 });
          this.logger.warn(`Onchain metadata not found for commit: ${commitId}`);
          continue;
        }

        // 5. デバッグ情報を出力（ログレベルを高く）
        console.log(`=== Debug Info for ${txId} ===`);
        console.log(`Transaction data:`, JSON.stringify(tx));
        console.log(`Proofs count: ${proofs.length}`);
        console.log(`DB Root Hash: ${dbRootHash}`);
        console.log(`Onchain Metadata: ${onchainMetadata}`);
        console.log(`Commit ID: ${commitId}`);

        // 6. MerkleServiceを使ってトランザクションデータとプルーフから検証
        const isValid = this.merkleService.verifyProof(
          tx,  // トランザクションデータ
          proofs,  // Merkleプルーフ
          onchainMetadata.json_metadata  // オンチェーンのルートハッシュ
        );

        if (isValid) {
          results.push({
            txId,
            status: VerifyStatus.VERIFIED,
            transactionHash: commitId,
            rootHash: onchainMetadata.json_metadata,
            label: onchainMetadata.label || 0
          });
          this.logger.log(`✅ Transaction verified: ${txId}`);
        } else {
          results.push({
            txId,
            status: VerifyStatus.NOT_VERIFIED,
            transactionHash: commitId,
            rootHash: onchainMetadata.json_metadata,
            label: 0
          });
          this.logger.warn(`❌ Transaction verification failed: ${txId}`);
        }
      }

      return results;
    }
}