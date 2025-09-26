import { Injectable, Logger } from '@nestjs/common';
import { MerkleTree } from 'merkletreejs';
import * as crypto from 'crypto';
import { TransactionDto } from '../transaction/dto/transaction.dto';
import { Position } from '@prisma/client';

@Injectable()
export class MerkleService {
  private readonly logger = new Logger(MerkleService.name);

  /**
   * データをハッシュ化してリーフノードを作成
   * @param data - ハッシュ化するデータ
   * @returns Buffer - SHA256ハッシュ
   */
  private createLeaf(data: TransactionDto): Buffer {
    // Dateオブジェクトを文字列に変換（決定的なハッシュ化のため）
    const normalizedData = {
      ...data,
      createdAt: data.createdAt instanceof Date ? data.createdAt.toISOString() : data.createdAt
    };

    // キーをソートして決定的なJSON文字列を生成
    const dataStr = JSON.stringify(normalizedData, Object.keys(normalizedData).sort());
    return crypto.createHash('sha256').update(Buffer.from(dataStr, 'utf8')).digest();
  }

  /**
   * 複数のデータからMerkleツリーを構築
   * @param dataArray - リーフデータの配列
   * @returns MerkleTree instance
   */
  buildTree(dataArray: TransactionDto[]): MerkleTree {
    const leaves = dataArray.map(data => this.createLeaf(data));

    const tree = new MerkleTree(
      leaves,
      (buf: Buffer) => crypto.createHash('sha256').update(buf).digest(),
      { sort: true }
    );

    this.logger.log(`🌳 Merkle Tree built with ${leaves.length} leaves`);
    return tree;
  }

  /**
   * Merkleツリーのルートハッシュを取得
   * @param tree - MerkleTree instance
   * @returns string - ルートハッシュ（16進文字列）
   */
  getRoot(tree: MerkleTree): string {
    return tree.getRoot().toString('hex');
  }

  /**
   * 特定のデータに対するMerkle Proofを生成
   * @param tree - MerkleTree instance
   * @param data - 証明対象のデータ
   * @returns Proof paths (without DB fields)
   */
  generateProof(tree: MerkleTree, data: TransactionDto): Array<{sibling: string, position: Position}> {
    const leaf = this.createLeaf(data);
    const proof = tree.getProof(leaf);

    return proof.map(p => ({
      sibling: p.data.toString('hex'),
      position: p.position === 'left' ? Position.LEFT : Position.RIGHT
    }));
  }

  /**
   * データとMerkle Proofからルートを再計算して検証
   * @param data - 検証対象のデータ
   * @param proof - Merkle Proof
   * @param expectedRoot - 期待されるルートハッシュ
   * @returns boolean - 検証結果
   */
  verifyProof(data: TransactionDto, proof: Array<{sibling: string}>, expectedRoot: string): boolean {
    if (expectedRoot === null || expectedRoot === undefined) {
      return false;
    }
    // リーフハッシュを計算
    let hash = this.createLeaf(data);
    console.log(`Initial leaf hash: ${hash.toString('hex')}`);

    // Proofパスを辿ってルートを再計算
    for (let i = 0; i < proof.length; i++) {
      const { sibling } = proof[i];
      const siblingBuf = Buffer.from(sibling, 'hex');

      // ソート済みツリーなので、小さい方を左に配置
      const [left, right] = Buffer.compare(hash, siblingBuf) <= 0
        ? [hash, siblingBuf]
        : [siblingBuf, hash];

      hash = crypto.createHash('sha256').update(Buffer.concat([left, right])).digest();
      console.log(`Step ${i + 1}: ${hash.toString('hex')} (sibling: ${sibling})`);
    }

    const calculatedRoot = hash.toString('hex');
    console.log(`Calculated root: ${calculatedRoot}`);
    console.log(`Expected root: ${expectedRoot}`);
    const isValid = calculatedRoot === expectedRoot;

    console.log(`Calculated root: ${calculatedRoot}`);
    console.log(`Expected root: ${expectedRoot}`);

    if (isValid) {
      this.logger.log('✅ Merkle proof verified successfully');
    } else {
      this.logger.warn('❌ Merkle proof verification failed');
      this.logger.warn(`Data used for verification:`, JSON.stringify(data));
    }

    return isValid;
  }

  /**
   * 複数のデータからMerkleルートを直接計算（ツリー構築なし）
   * @param dataArray - データの配列
   * @returns string - ルートハッシュ（16進文字列）
   */
  calculateRoot(dataArray: TransactionDto[]): string {
    const tree = this.buildTree(dataArray);
    return this.getRoot(tree);
  }

  /**
   * 全てのリーフに対するProofを一括生成
   * @param tree - MerkleTree instance
   * @param dataArray - 全リーフデータ
   * @returns Map<string, Array<{sibling: string, position: Position}>> - データIDをキーとしたProofマップ
   */
  generateAllProofs(tree: MerkleTree, dataArray: TransactionDto[]): Map<string, Array<{sibling: string, position: Position}>> {
    const proofMap = new Map<string, Array<{sibling: string, position: Position}>>();

    for (const data of dataArray) {
      const proof = this.generateProof(tree, data);
      proofMap.set(data.id, proof);
    }

    this.logger.log(`📋 Generated ${proofMap.size} proofs`);
    return proofMap;
  }
}