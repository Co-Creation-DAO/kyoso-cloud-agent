import { Module } from '@nestjs/common';
import { TransactionModule } from './transaction/transaction.module';
import { WalletModule } from './wallet/wallet.module';
import { MerkleModule } from './merkle/merkle.module';
import { PrismaModule } from './prisma/prisma.module';
import { VerifyModule } from './verify/verify.module';
import { CommitModule } from './commit/commit.module';
import { PointController } from './point.controller';

@Module({
  imports: [TransactionModule, WalletModule, MerkleModule, PrismaModule, VerifyModule, CommitModule],
  controllers: [PointController]
})
export class PointModule {}
