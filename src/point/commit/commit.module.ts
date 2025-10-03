import { Module } from '@nestjs/common';
import { CommitService } from './commit.service';
import { WalletModule } from '../wallet/wallet.module';
import { TransactionModule } from '../transaction/transaction.module';
import { MerkleModule } from '../merkle/merkle.module';
import { PrismaModule } from '../prisma/prisma.module';


@Module({
  providers: [CommitService],
  imports: [WalletModule, TransactionModule, MerkleModule, PrismaModule],
  exports: [CommitService],
})
export class CommitModule {}
