import { PrismaClient } from '@prisma/client';
import { User, Wallet } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 必要なテーブルが全て存在するかチェック
  const requiredTables = [
    't_communities',
    't_users',
    't_wallets',
    't_transactions',
    't_merkle_commits',
    't_merkle_proofs'
  ];

  let allTablesExist = true;
  for (const table of requiredTables) {
    try {
      await prisma.$queryRaw`SELECT 1 FROM information_schema.tables WHERE table_name = ${table} LIMIT 1`;
      console.log(`✅ Table ${table} found`);
    } catch {
      console.log(`❌ Table ${table} not found`);
      allTablesExist = false;
    }
  }

  if (!allTablesExist) {
    console.log('⚠️ Some tables are missing. Running migrations...');
    try {
      // データベースをリセットして、マイグレーションを適用
      console.log('📦 Applying database schema...');
      execSync('npx prisma db push --force-reset', { stdio: 'inherit' });
      console.log('✅ Database schema applied successfully');
    } catch (migrationError) {
      console.error('❌ Failed to apply database schema:', migrationError);
      throw migrationError;
    }
  }

  // 既存データをクリーンアップ（順序重要：外部キー制約のため）
  console.log('🧹 Cleaning existing data...');

  try {
    await prisma.merkleProof.deleteMany();
    await prisma.merkleCommit.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.wallet.deleteMany();
    await prisma.user.deleteMany();
    await prisma.community.deleteMany();
  } catch (cleanupError) {
    console.log('⚠️ Some tables may not exist. Skipping cleanup for non-existent tables.');
    // テーブルが存在しない場合はスキップして続行
  }

  console.log('✅ Existing data cleaned');

  // Community作成
  const community = await prisma.community.create({
    data: {
      id: 'test-community',
      name: 'Test Community',
      pointName: 'TestPoint',
    },
  });

  console.log('🏘️ Community created:', community.id);

  // User作成（10人）
  const users: User[] = [];
  for (let i = 0; i < 10; i++) {
    const user = await prisma.user.create({
      data: {
        id: `test-user-${i}`,
        name: `Test User ${i}`,
        slug: `test-user-${i}`,
        sysRole: 'USER',
        currentPrefecture: 'UNKNOWN',
      },
    });
    users.push(user);
  }

  console.log('👥 Users created:', users.length);

  // Wallet作成（10個）
  const wallets: Wallet[] = [];
  for (let i = 0; i < 10; i++) {
    const wallet = await prisma.wallet.create({
      data: {
        id: `test-wallet-${i}`,
        type: 'MEMBER',
        communityId: community.id,
        userId: users[i].id,
      },
    });
    wallets.push(wallet);
  }

  console.log('💳 Wallets created:', wallets.length);

  // 3週間前からのトランザクション作成（各週100件）
  const now = new Date();
  const threeWeeksAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);

  let totalTransactions = 0;
  for (let week = 0; week < 3; week++) {
    const weekStart = new Date(threeWeeksAgo.getTime() + week * 7 * 24 * 60 * 60 * 1000);

    for (let i = 0; i < 100; i++) {
      const fromIdx = i % 10;
      const toIdx = (i + 1) % 10;

      await prisma.transaction.create({
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
      totalTransactions++;
    }

    console.log(`📅 Week ${week} transactions created: 100`);
  }

  console.log(`✅ Total transactions created: ${totalTransactions}`);

  // 作成されたデータの統計を表示
  const stats = {
    communities: await prisma.community.count(),
    users: await prisma.user.count(),
    wallets: await prisma.wallet.count(),
    transactions: await prisma.transaction.count(),
  };

  console.log('📊 Database seeding completed!');
  console.log('📈 Final statistics:', stats);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });