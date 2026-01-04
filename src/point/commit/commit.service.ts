import { Injectable, Logger } from '@nestjs/common';
import { WalletService } from '../wallet/wallet.service';
import { MerkleService } from '../merkle/merkle.service';
import { TransactionService } from '../transaction/transaction.service';
import { MerkleProof } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CommitDto } from './dto/commit.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommitService {
    private readonly logger = new Logger(CommitService.name);

    constructor(
        private readonly merkleService: MerkleService,
        private readonly transactionService: TransactionService,
        private readonly walletService: WalletService,
        private readonly prismaService: PrismaService,
    ) { }

    // 一週間に一回コミット
    @Cron(CronExpression.EVERY_WEEK)
    async commit() : Promise<CommitDto> {
        // 1. 最古の未コミットトランザクションを取得（RLS/GUC付き）
        let commitDto: CommitDto = new CommitDto();
        const oldestUncommittedTransaction = await this.prismaService.withRlsContext(async (tx) => {
            return this.transactionService.findOldestUncommittedTransaction(tx);
        });

        //　もし最古の未コミットトランザクションがない場合は終了
        if (!oldestUncommittedTransaction) {
            this.logger.log('✅ No uncommitted transactions found');
            return commitDto;
        }

        // 2. 最古の未コミットトランザクション以降の全ての未コミットトランザクションを取得（RLS/GUC付き）
        const uncommittedTransactions = await this.prismaService.withRlsContext(async (tx) => {
            return this.transactionService.findUncommittedTransactionsFromId(oldestUncommittedTransaction.id, tx);
        });


        // 3. トランザクションをメリークルツリーに変換
        const merkleTree = this.merkleService.buildTree(uncommittedTransactions);

        // 4. メリークルツリーのルートハッシュを取得
        const rootHash = this.merkleService.getRoot(merkleTree);

        // 5. ラベルを取得（RLS/GUC付き）
        const label = await this.prismaService.withRlsContext(async (tx) => {
            return this.transactionService.getNextCommitLabel(tx);
        });

        // 5. メタデータをオンチェーンにコミット（DB外のI/Oのためトランザクション外）
        const txHash = await this.walletService.commitMetadata(label, rootHash);

        // 6. DBにコミット情報を保存（RLS/GUC付き、同一トランザクションでまとめて保存）
        await this.prismaService.withRlsContext(async (tx) => {
            await this.transactionService.saveMerkleCommit({
                id: txHash,
                rootHash,
                label,
                periodStart: oldestUncommittedTransaction.createdAt,
                periodEnd: uncommittedTransactions[uncommittedTransactions.length - 1].createdAt,
            }, tx);
        });

        // 7. MerkleProofを作成
        const merkleProofs = this.merkleService.generateAllProofs(merkleTree, uncommittedTransactions);
        const proofArray: Omit<MerkleProof, 'id' | 'tx' | 'commit'>[] = [];
        merkleProofs.forEach((proofs, txId) => {
            proofs.forEach((proof, index) => {
                proofArray.push({
                    commitId: txHash,
                    txId,
                    index,
                    sibling: proof.sibling,
                    position: proof.position
                });
            });
        });


        // 8. DBにMerkleProofを保存（RLS/GUC付き、バッチで保存）
        // 大量のProofを保存するため、タイムアウトを120秒に延長
        await this.prismaService.withRlsContext(async (tx) => {
            await this.transactionService.saveMerkleProofs(proofArray, tx);
        }, 'system', 'on', 120000);

        const walletAddress = await this.walletService.getChangeAddress();

        commitDto = {
            txHash: txHash,
            label: label,
            rootHash: rootHash,
            periodStart: oldestUncommittedTransaction.createdAt,
            periodEnd: uncommittedTransactions[uncommittedTransactions.length - 1].createdAt,
            walletAddress: walletAddress,
        };

        return commitDto;
    }
}