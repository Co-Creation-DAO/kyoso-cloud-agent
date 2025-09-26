import { Module } from '@nestjs/common';
import { CommitService } from './commit.service';
import { WalletModule } from '../wallet/wallet.module';
import { TransactionModule } from '../transaction/transaction.module';
import { MerkleModule } from '../merkle/merkle.module';


@Module({
  providers: [CommitService],
  imports: [WalletModule, TransactionModule, MerkleModule],
  exports: [CommitService],
})
export class CommitModule {}
