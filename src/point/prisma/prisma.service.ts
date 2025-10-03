import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
    // Try to set RLS bypass at session level for connection pool
    try {
      await this.$executeRawUnsafe(`SELECT set_config('app.rls_bypass', 'on', false)`);
    } catch (error) {
      console.warn('Could not set app.rls_bypass:', error);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async withRlsContext<T>(
    runInTx: (tx: Prisma.TransactionClient) => Promise<T>,
    userId: string = 'system',
    rlsBypass: 'on' | 'off' = 'on',
  ): Promise<T> {
    return this.$transaction(async (tx) => {
      await tx.$executeRaw`select set_config('app.rls_bypass', ${rlsBypass}, true)`;
      await tx.$executeRaw`select set_config('app.rls_config.user_id', ${userId}, true)`;
      return runInTx(tx);
    });
  }
}
