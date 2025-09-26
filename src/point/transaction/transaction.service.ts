import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionDto } from './dto/transaction.dto';
import { MerkleCommit, MerkleProof } from '@prisma/client';


@Injectable()
export class TransactionService {
    private readonly logger = new Logger(TransactionService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * 未コミットの最古のトランザクションを取得
     * @returns 最古の未コミットトランザクション or null
     */
    async findOldestUncommittedTransaction() {
        return this.prisma.transaction.findFirst({
            where: { merkleProofs: { none: {} } },
            orderBy: { createdAt: 'asc' },
        });
    }

    /**
     * 指定期間内の未コミットトランザクションを取得
     * @param periodStart - 開始日時
     * @param periodEnd - 終了日時
     * @returns TransactionDto配列
     */
    async findUncommittedTransactionsInPeriod(
        periodStart: Date,
        periodEnd: Date
    ): Promise<TransactionDto[]> {
        const txs = await this.prisma.transaction.findMany({
            where: {
                createdAt: { gte: periodStart, lt: periodEnd },
                merkleProofs: { none: {} },
            },
            select: {
                id: true,
                from: true,
                fromPointChange: true,
                to: true,
                toPointChange: true,
                createdAt: true,
            },
        });

        return txs.map(tx => ({
            id: tx.id,
            from: tx.from || '',
            fromPointChange: tx.fromPointChange,
            to: tx.to || '',
            toPointChange: tx.toPointChange,
            createdAt: tx.createdAt,
        }));
    }

    /**
     * 指定IDのトランザクション以降の全ての未コミットトランザクションを取得
     * @param fromTxId - 開始トランザクションID
     * @returns TransactionDto配列
     */
    async findUncommittedTransactionsFromId(fromTxId: string): Promise<TransactionDto[]> {
        // まず指定IDのトランザクションを取得して作成日時を取得
        const fromTx = await this.prisma.transaction.findUnique({
            where: { id: fromTxId },
            select: { createdAt: true },
        });

        if (!fromTx) {
            this.logger.warn(`Transaction not found: ${fromTxId}`);
            return [];
        }

        // その日時以降の全ての未コミットトランザクションを取得
        const txs = await this.prisma.transaction.findMany({
            where: {
                createdAt: { gte: fromTx.createdAt },
                merkleProofs: { none: {} },
            },
            select: {
                id: true,
                from: true,
                fromPointChange: true,
                to: true,
                toPointChange: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'asc' },
        });

        return txs.map(tx => ({
            id: tx.id,
            from: tx.from || '',
            fromPointChange: tx.fromPointChange,
            to: tx.to || '',
            toPointChange: tx.toPointChange,
            createdAt: tx.createdAt,
        }));
    }

    /**
     * 指定期間内の未コミットトランザクション数をカウント
     * @param periodStart - 開始日時
     * @param periodEnd - 終了日時
     * @returns トランザクション数
     */
    async countUncommittedTransactionsInPeriod(
        periodStart: Date,
        periodEnd: Date
    ): Promise<number> {
        return this.prisma.transaction.count({
            where: {
                createdAt: { gte: periodStart, lt: periodEnd },
                merkleProofs: { none: {} },
            },
        });
    }

    /**
     * IDでトランザクションを取得
     * @param txId - トランザクションID
     * @returns TransactionDto or null
     */
    async findTransactionById(txId: string): Promise<TransactionDto | null> {
        const tx = await this.prisma.transaction.findUnique({
            where: { id: txId },
            select: {
                id: true,
                from: true,
                fromPointChange: true,
                to: true,
                toPointChange: true,
                createdAt: true,
            },
        });

        if (!tx) return null;

        return {
            id: tx.id,
            from: tx.from || '',
            fromPointChange: tx.fromPointChange,
            to: tx.to || '',
            toPointChange: tx.toPointChange,
            createdAt: tx.createdAt,
        };
    }

    /**
     * 次のMerkle Commitラベル番号を取得
     * @returns 次のラベル番号
     */
    async getNextCommitLabel(): Promise<number> {
        const count = await this.prisma.merkleCommit.count();
        return count + 1;
    }

    /**
     * 最新のMerkle Commitを取得
     * @returns 最新のコミット情報 or null
     */
    async getLatestCommit() {
        return this.prisma.merkleCommit.findFirst({
            orderBy: { label: 'desc' },
            select: { periodEnd: true },
        });
    }

    /**
     * Merkle Commitを保存
     * @param commitData - コミットデータ
     */
    async saveMerkleCommit(commitData: Omit<MerkleCommit, 'committed_at' | 'proofs'>): Promise<void> {
        await this.prisma.merkleCommit.create({
            data: commitData,
        });
        this.logger.log(`💾 Merkle commit saved: {commitData.id}`);
    }

    /**
     * Merkle Proofを一括保存
     * @param proofs - プルーフデータの配列
     */
    async saveMerkleProofs(proofs: Omit<MerkleProof, 'id' | 'tx' | 'commit'>[]): Promise<void> {
        // 1000件ずつバッチ処理（Prismaの制限対応）
        for (let i = 0; i < proofs.length; i += 1000) {
            await this.prisma.merkleProof.createMany({
                data: proofs.slice(i, i + 1000),
            });
        }
        this.logger.log(`💾 ${proofs.length} Merkle proofs saved`);
    }

    /**
     * トランザクションのMerkle Proofを取得
     * @param txId - トランザクションID
     * @returns プルーフの配列 or null
     */
    async getProofsForTransaction(txId: string): Promise<Array<{ sibling: string }> | null> {
        // 1. このtxIdが含まれるコミットを特定
        const proofRecord = await this.prisma.merkleProof.findFirst({
            where: { txId },
            select: { commitId: true },
        });

        if (!proofRecord) {
            return null;
        }

        // 2. そのコミット内でのこのtxIdの全プルーフを取得
        const proofs = await this.prisma.merkleProof.findMany({
            where: {
                commitId: proofRecord.commitId,
                txId
            },
            orderBy: { index: 'asc' },
            select: { sibling: true },
        });

        return proofs;
    }

    /**
     * トランザクションのルートハッシュを取得
     * @param txId - トランザクションID
     * @returns ルートハッシュとコミットID or null
     */
    async getRootHashForTransaction(txId: string): Promise<{ commitId: string; rootHash: string } | null> {
        // このtxIdが含まれるコミットとそのルートハッシュを取得
        const proofWithCommit = await this.prisma.merkleProof.findFirst({
            where: { txId },
            include: {
                commit: {
                    select: {
                        id: true,
                        rootHash: true,
                    }
                }
            },
        });

        if (!proofWithCommit) {
            return null;
        }

        return {
            commitId: proofWithCommit.commit.id,
            rootHash: proofWithCommit.commit.rootHash,
        };
    }

    /**
     * 全データベースをクリーンアップ（テスト用）
     */
    async cleanupAll(): Promise<void> {
        await this.prisma.merkleProof.deleteMany();
        await this.prisma.merkleCommit.deleteMany();
        await this.prisma.transaction.deleteMany();
        this.logger.log('🧹 Database cleaned up');
    }
}