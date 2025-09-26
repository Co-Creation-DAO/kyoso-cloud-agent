import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/point/prisma/prisma.service';
import { User, Wallet, MerkleCommit } from '@prisma/client';
import { CommitService } from '../src/point/commit/commit.service';
import { WalletService } from '../src/point/wallet/wallet.service';

describe('Transaction E2E Test (本番環境同等)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let oldTxIds: string[] = [];
  let commitService: CommitService;
  let commits: MerkleCommit[] = [];
  let walletService: WalletService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    commitService = app.get<CommitService>(CommitService);
    walletService = app.get<WalletService>(WalletService);
    // データベースのクリーンアップ
    await prisma.merkleProof.deleteMany();
    await prisma.merkleCommit.deleteMany();
    await prisma.transaction.deleteMany();

    console.log('✅ Database cleaned');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('初期データセットアップ', () => {
    it('過去のトランザクションと3週間分作成', async () => {
      // Community作成
      const community = await prisma.community.upsert({
        where: { id: 'test-community' },
        update: {},
        create: {
          id: 'test-community',
          name: 'Test Community',
          pointName: 'TestPoint',
        },
      });

      // User作成
      const users: User[] = [];
      for (let i = 0; i < 10; i++) {
        const user = await prisma.user.upsert({
          where: { id: `test-user-${i}` },
          update: {},
          create: {
            id: `test-user-${i}`,
            name: `Test User ${i}`,
            slug: `test-user-${i}`,
            sysRole: 'USER',
            currentPrefecture: 'UNKNOWN',
          },
        });
        users.push(user);
      }

      // Wallet作成
      const wallets: Wallet[] = [];
      for (let i = 0; i < 10; i++) {
        const wallet = await prisma.wallet.upsert({
          where: { id: `test-wallet-${i}` },
          update: {},
          create: {
            id: `test-wallet-${i}`,
            type: 'MEMBER',
            communityId: community.id,
            userId: users[i].id,
          },
        });
        wallets.push(wallet);
      }

      // 3週間前からのトランザクション作成（各週100件）
      const now = new Date();
      const threeWeeksAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);

      for (let week = 0; week < 3; week++) {
        const weekStart = new Date(threeWeeksAgo.getTime() + week * 7 * 24 * 60 * 60 * 1000);

        for (let i = 0; i < 100; i++) {
          const fromIdx = i % 10;
          const toIdx = (i + 1) % 10;
          const tx = await prisma.transaction.create({
            data: {
              id: `tx_old_w${week}_${i.toString().padStart(3, '0')}`,
              reason: 'POINT_ISSUED',
              from: wallets[fromIdx].id,
              fromPointChange: -(100 + i),
              to: wallets[toIdx].id,
              toPointChange: 100 + i,
              createdAt: new Date(weekStart.getTime() + i * 60 * 60 * 1000),
              createdBy: users[0].id,
            },
          });

          oldTxIds.push(tx.id);
        }
      }

      const count = await prisma.transaction.count();
      expect(count).toBe(300);
      console.log(`✅ Created ${count} old transactions (3 weeks x 100 tx)`);
    });
  });

  describe('正常系: トランザクションコミット', () => {
    it('ウォレット残高確認', async () => {
      const balance = await walletService.getBalance();
      console.log('💰 Current wallet balance:', balance);

      const utxos = await walletService.getUtxos();
      console.log(`📦 Available UTXOs: ${utxos.length}`);
      utxos.forEach((utxo, index) => {
        const lovelace = utxo.output.amount.find(a => a.unit === 'lovelace');
        console.log(`  UTxO ${index}: ${utxo.input.txHash}#${utxo.input.outputIndex} - ${lovelace?.quantity} lovelace`);
      });

      expect(balance.length).toBeGreaterThan(0);
      expect(utxos.length).toBeGreaterThan(0);
    });

    it('トランザクションコミット', async () => {
      try {
        await commitService.commit();
      } catch (error) {
        console.error('❌ Commit failed:', error);
        throw error;
      }

      commits = await prisma.merkleCommit.findMany();
      const proofs = await prisma.merkleProof.findMany();

      console.log(`✅ Commits created: ${commits.length}`);
      console.log(`✅ Proofs created: ${proofs.length}`);

      expect(commits.length).toBe(1);
      expect(commits[0].label).toBe(1);

      expect(proofs.length).toBeGreaterThan(2000);

    }, 60000);
  });

  describe('正常系: トランザクション検証', () => {
    it('トランザクション検証', async () => {

      // トランザクションが反映されるまでまつ
      const txHash = commits[0].id;
      console.log(`⏳ Waiting for transaction confirmation: ${txHash}`);
      const transactionConfirmed = await walletService.waitForTransactionConfirmation(txHash, 120, 5000);

      expect(transactionConfirmed).toBe(true);
      console.log('✅ Transaction confirmed on chain');

      // 過去のトランザクションからランダムに10件検証
      const randomTxIds = oldTxIds.sort(() => Math.random() - 0.5).slice(0, 10);
      console.log(`🔍 Verifying ${randomTxIds.length} random transactions`);

      const response = await request(app.getHttpServer())
        .post('/point/verify')
        .send({ txIds: randomTxIds })
        .expect(200);

      console.log(`✅ Verification response:`, response.body);
    }, 12 * 60 * 1000); // 12分のタイムアウト
  });

  describe('異常系: 改竄検証', () => {
    it('トランザクションを改竄したらnot_verifiedになる', async () => {
      // 改竄対象のトランザクションIDを選択
      const tamperedTxId = oldTxIds[50]; // 50番目のトランザクション
      console.log(`🔨 Tampering transaction: ${tamperedTxId}`);

      // 1. 改竄前の正常な検証
      const beforeResponse = await request(app.getHttpServer())
        .post('/point/verify')
        .send({ txIds: [tamperedTxId] })
        .expect(200);

      console.log('✅ Before tampering:', beforeResponse.body);
      expect(beforeResponse.body[0].status).toBe('verified');

      // 2. データベースを改竄（ポイントを変更）
      await prisma.transaction.update({
        where: { id: tamperedTxId },
        data: {
          toPointChange: 999999,  // 大幅に変更
          fromPointChange: -999999
        }
      });
      console.log('⚠️ Database tampered: changed point values');

      // 3. 改竄後の検証（失敗するはず）
      const afterResponse = await request(app.getHttpServer())
        .post('/point/verify')
        .send({ txIds: [tamperedTxId] })
        .expect(200);

      console.log('❌ After tampering:', afterResponse.body);
      expect(afterResponse.body[0].status).toBe('not_verified');


      // uncommittedTxが0になることを確認
      const uncommittedTx = await prisma.transaction.count({
        where: { merkleProofs: { none: {} } }
      });
      expect(uncommittedTx).toBe(0);

    }, 60000);
  });

  describe('正常系: 追加コミット用のトランザクション追加', () => {
    let newTxIds: string[] = [];

    it('新しいトランザクションデータを追加', async () => {
      console.log('📝 Adding new transactions...');

      // 新しい週のトランザクションを50件追加
      const now = new Date();
      for (let i = 0; i < 50; i++) {
        const fromIdx = i % 10;
        const toIdx = (i + 1) % 10;

        const wallets = await prisma.wallet.findMany({
          take: 10,
          orderBy: { id: 'asc' }
        });

        const users = await prisma.user.findMany({
          take: 10,
          orderBy: { id: 'asc' }
        });

        const tx = await prisma.transaction.create({
          data: {
            id: `tx_new_${i.toString().padStart(3, '0')}`,
            reason: 'POINT_ISSUED',
            from: wallets[fromIdx].id,
            fromPointChange: -(200 + i),
            to: wallets[toIdx].id,
            toPointChange: 200 + i,
            createdAt: new Date(now.getTime() + i * 60 * 1000), // 1分間隔
            createdBy: users[0].id,
          },
        });

        newTxIds.push(tx.id);
      }

      const totalTxCount = await prisma.transaction.count();
      const uncommittedTx = await prisma.transaction.count({
        where: { merkleProofs: { none: {} } }
      });
      console.log(`✅ Added ${newTxIds.length} new transactions`);
      console.log(`📊 Total transactions: ${totalTxCount}`);
      console.log(`📊 Uncommitted transactions: ${uncommittedTx}`);
      expect(newTxIds.length).toBe(50);
      expect(totalTxCount).toBe(350); // 既存300 + 新規50
      expect(uncommittedTx).toBe(50);
    });

    it('正常系: 追加コミット', async () => {
      console.log('⏰ Performing weekly commit...');

      // 40秒待機
      await new Promise(resolve => setTimeout(resolve, 40000));

      // 週次コミット実行
      await commitService.commit();

      // コミット結果確認
      const allCommits = await prisma.merkleCommit.findMany({
        orderBy: { label: 'asc' }
      });
      const allProofs = await prisma.merkleProof.findMany();

      console.log(`✅ Total commits: ${allCommits.length}`);
      console.log(`✅ Total proofs: ${allProofs.length}`);

      // 2つ目のコミットが作成されることを確認
      expect(allCommits.length).toBe(2);
      expect(allCommits[1].label).toBe(2);

      // 新しいプルーフが追加されることを確認
      expect(allProofs.length).toBeGreaterThan(2596);

      // 最新のコミットトランザクションが確認されるまで待機
      const latestCommitId = allCommits[allCommits.length - 1].id;
      console.log(`⏳ Waiting for latest commit confirmation: ${latestCommitId}`);

      const transactionConfirmed = await walletService.waitForTransactionConfirmation(latestCommitId, 120, 5000);
      expect(transactionConfirmed).toBe(true);
      console.log('✅ Latest commit confirmed on chain');

    }, 12 * 60 * 1000); // 12分のタイムアウト

    it('正常系: 追加コミット用のトランザクション検証', async () => {
      console.log('🔍 Verifying new transactions...');

      // 新規トランザクションから10件をランダム選択
      const randomNewTxIds = newTxIds.sort(() => Math.random() - 0.5).slice(0, 10);

      const response = await request(app.getHttpServer())
        .post('/point/verify')
        .send({ txIds: randomNewTxIds })
        .expect(200);

      console.log(`✅ New transaction verification response:`, response.body);

      // 全て検証成功することを確認
      response.body.forEach((result: any) => {
        expect(result.status).toBe('verified');
        expect(result.label).toBe("2"); // 2番目のコミット
      });

      console.log('✅ All new transactions verified successfully');
    }, 60000);

    it('正常系: 古いトランザクションも検証可能', async () => {
      console.log('🔍 Verifying old transactions are still valid...');

      // 1. 改竄されていた方が検証できないことを確認
      const tamperedTxId = oldTxIds[50];
      const tamperedResponse = await request(app.getHttpServer())
        .post('/point/verify')
        .send({ txIds: [tamperedTxId] })
        .expect(200);
      expect(tamperedResponse.body[0].status).toBe('not_verified');

      // 2. 改竄されていない方が検証できることを確認
      const validTxId = oldTxIds[51];
      const validResponse = await request(app.getHttpServer())
        .post('/point/verify')
        .send({ txIds: [validTxId] })
        .expect(200);
      expect(validResponse.body[0].status).toBe('verified');

      console.log('✅ Old transactions still verified successfully');
    }, 60000);

    it('統計情報の最終確認', async () => {
      const stats = {
        transactions: await prisma.transaction.count(),
        commits: await prisma.merkleCommit.count(),
        proofs: await prisma.merkleProof.count(),
        uncommittedTx: await prisma.transaction.count({
          where: { merkleProofs: { none: {} } }
        })
      };

      console.log('\n📊 Final Production Simulation Statistics:');
      console.log(`   Total Transactions: ${stats.transactions}`);
      console.log(`   Total Commits: ${stats.commits}`);
      console.log(`   Total Proofs: ${stats.proofs}`);
      console.log(`   Uncommitted Transactions: ${stats.uncommittedTx}`);

      expect(stats.transactions).toBe(350);
      expect(stats.commits).toBe(2);
      expect(stats.uncommittedTx).toBe(0); // 全てコミット済み
    });
  });
});