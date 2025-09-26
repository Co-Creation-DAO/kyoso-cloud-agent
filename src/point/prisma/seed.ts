// src/prisma/seed.ts

import { PrismaClient, Prisma, TransactionReason, WalletType } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🧹 既存のシード由来データをクリアします…');
  // まず Merkle 関連を全消し → シード由来トランザクションのみ削除
  await prisma.merkleProof.deleteMany();
  await prisma.merkleCommit.deleteMany();
  const SEED_USER_IDS = ['seed-user-alice', 'seed-user-bob', 'seed-user-carol'];
  await prisma.transaction.deleteMany({ where: { createdBy: { in: SEED_USER_IDS } } });

  console.log('🏗️ マスタ（Community / User / Wallet）を準備します…');
  // Community（固定IDで冪等化）
  const community = await prisma.community.upsert({
    where: { id: 'seed-community' },
    update: { name: 'Demo Community', pointName: 'Point' },
    create: { id: 'seed-community', name: 'Demo Community', pointName: 'Point' },
  });

  // Users（固定ID）
  const [alice, bob, carol] = await Promise.all([
    prisma.user.upsert({
      where: { id: 'seed-user-alice' },
      update: { name: 'Alice', slug: 'alice' },
      create: { id: 'seed-user-alice', name: 'Alice', slug: 'alice', sysRole: 'USER', currentPrefecture: 'UNKNOWN' },
    }),
    prisma.user.upsert({
      where: { id: 'seed-user-bob' },
      update: { name: 'Bob', slug: 'bob' },
      create: { id: 'seed-user-bob', name: 'Bob', slug: 'bob', sysRole: 'USER', currentPrefecture: 'UNKNOWN' },
    }),
    prisma.user.upsert({
      where: { id: 'seed-user-carol' },
      update: { name: 'Carol', slug: 'carol' },
      create: { id: 'seed-user-carol', name: 'Carol', slug: 'carol', sysRole: 'USER', currentPrefecture: 'UNKNOWN' },
    }),
  ]);

  // Wallets（固定ID）
  const [aliceWallet, bobWallet, carolWallet] = await Promise.all([
    prisma.wallet.upsert({
      where: { id: 'seed-wallet-alice' },
      update: {},
      create: {
        id: 'seed-wallet-alice',
        type: WalletType.MEMBER,
        communityId: community.id,
        userId: alice.id,
      },
    }),
    prisma.wallet.upsert({
      where: { id: 'seed-wallet-bob' },
      update: {},
      create: {
        id: 'seed-wallet-bob',
        type: WalletType.MEMBER,
        communityId: community.id,
        userId: bob.id,
      },
    }),
    prisma.wallet.upsert({
      where: { id: 'seed-wallet-carol' },
      update: {},
      create: {
        id: 'seed-wallet-carol',
        type: WalletType.MEMBER,
        communityId: community.id,
        userId: carol.id,
      },
    }),
  ]);

  console.log('📝 期間を分散したトランザクションを作成します…');
  const now = new Date();
  const days = 30;           // 直近30日
  const perDay = 10;         // 1日あたり10件
  const seedCreatorUserId = alice.id; // すべて Alice が作成した体にする（FK満たす）

  const pairs = [
    { from: aliceWallet.id, to: bobWallet.id },
    { from: bobWallet.id,   to: carolWallet.id },
    { from: carolWallet.id, to: aliceWallet.id },
  ];

  const txBatch: Prisma.TransactionCreateManyInput[] = [];

  for (let d = 0; d < days; d++) {
    for (let k = 0; k < perDay; k++) {
      const pick = pairs[(d * perDay + k) % pairs.length];
      const amount = 5 + ((d + k) % 6) * 5; // 5,10,15,20,25,30 のループ
      const createdAt = new Date(now.getTime() - d * 86_400_000 - (k * 3_600_000) / 2); // d日前・時間ずらし
      const reasonPool: TransactionReason[] = [
        TransactionReason.POINT_REWARD,
        TransactionReason.DONATION,
        TransactionReason.GRANT,
      ];
      const reason = reasonPool[(d + k) % reasonPool.length];

      txBatch.push({
        reason,
        from: pick.from,
        to: pick.to,
        fromPointChange: -amount,
        toPointChange: amount,
        createdAt,
        createdBy: seedCreatorUserId,
      });
    }
  }

  // まとめて投入
  const chunkSize = 500;
  for (let i = 0; i < txBatch.length; i += chunkSize) {
    const chunk = txBatch.slice(i, i + chunkSize);
    await prisma.transaction.createMany({ data: chunk });
    console.log(`  ・Inserted ${Math.min(i + chunkSize, txBatch.length)} / ${txBatch.length}`);
  }

  console.log('✅ シード完了: users=3, wallets=3, transactions=' + txBatch.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
