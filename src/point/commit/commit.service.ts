import { Injectable, Logger } from '@nestjs/common';
import { WalletService } from '../wallet/wallet.service';
import { MerkleService } from '../merkle/merkle.service';
import { TransactionService } from '../transaction/transaction.service';
import { MerkleProof } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CommitDto } from './dto/commit.dto';

@Injectable()
export class CommitService {
    private readonly logger = new Logger(CommitService.name);

    constructor(
        private readonly merkleService: MerkleService,
        private readonly transactionService: TransactionService,
        private readonly walletService: WalletService,
    ) { }

    // 一週間に一回コミット
    @Cron(CronExpression.EVERY_WEEK)
    async commit() : Promise<CommitDto> {
        // 1. 最古の未コミットトランザクションを取得
        let commitDto: CommitDto = new CommitDto();
        const oldestUncommittedTransaction = await this.transactionService.findOldestUncommittedTransaction();

        //　もし最古の未コミットトランザクションがない場合は終了
        if (!oldestUncommittedTransaction) {
            this.logger.log('✅ No uncommitted transactions found');
            return commitDto;
        }

        // 2. 最古の未コミットトランザクション以降の全ての未コミットトランザクションを取得
        const uncommittedTransactions = await this.transactionService.findUncommittedTransactionsFromId(oldestUncommittedTransaction.id);


        // 3. トランザクションをメリークルツリーに変換
        const merkleTree = this.merkleService.buildTree(uncommittedTransactions);

        // 4. メリークルツリーのルートハッシュを取得
        const rootHash = this.merkleService.getRoot(merkleTree);

        // 5. ラベルを取得
        const label = await this.transactionService.getNextCommitLabel();

        // 5. メタデータをオンチェーンにコミット
        const txHash = await this.walletService.commitMetadata(label, rootHash);

        // 6. DBにコミット情報を保存
        await this.transactionService.saveMerkleCommit({
            id: txHash,
            rootHash,
            label,
            periodStart: oldestUncommittedTransaction.createdAt,
            periodEnd: uncommittedTransactions[uncommittedTransactions.length - 1].createdAt,
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


        // 8. DBにMerkleProofを保存
        await this.transactionService.saveMerkleProofs(proofArray);

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