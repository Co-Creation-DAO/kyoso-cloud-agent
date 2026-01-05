import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    // 非ブロッキング: 起動時にDBへ強制接続しない
    // set_configは最初のクエリでトランザクション内に再設定するため、ここではベストエフォートのみ
    try {
      // 接続試行はするが await しないことで起動をブロックしない
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.$connect();
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.$executeRawUnsafe(`SELECT set_config('app.rls_bypass', 'on', false)`);
    } catch (error) {
      console.warn('Startup non-blocking init skipped:', error);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async withRlsContext<T>(
    runInTx: (tx: Prisma.TransactionClient) => Promise<T>,
    userId: string = 'system',
    rlsBypass: 'on' | 'off' = 'on',
    timeout: number = 5000,
  ): Promise<T> {
    return this.$transaction(async (tx) => {
      await tx.$executeRaw`select set_config('app.rls_bypass', ${rlsBypass}, true)`;
      await tx.$executeRaw`select set_config('app.rls_config.user_id', ${userId}, true)`;
      return runInTx(tx);
    }, {
      timeout,
      maxWait: 10000,
    });
  }
}
