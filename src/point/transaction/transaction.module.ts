import { Module } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { PrismaModule } from '../prisma/prisma.module';


@Module({
  providers: [TransactionService],
  imports: [PrismaModule],
  exports: [TransactionService],
})
export class TransactionModule {}
