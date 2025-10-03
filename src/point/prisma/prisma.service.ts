import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
    // Set RLS bypass to 'on' to skip Row Level Security policies
    await this.$executeRaw`SET app.rls_bypass = 'on'`;
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
