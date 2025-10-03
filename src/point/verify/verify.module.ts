// src/verify/verify.module.ts
import { Module } from '@nestjs/common';
import { VerifyService } from './verify.service';
import { TransactionModule } from '../transaction/transaction.module';
import { WalletModule } from '../wallet/wallet.module';
import { MerkleModule } from '../merkle/merkle.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [TransactionModule, WalletModule, MerkleModule, PrismaModule],
  providers: [VerifyService],
  exports: [VerifyService],
})
export class VerifyModule {}
