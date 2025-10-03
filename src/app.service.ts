import { Injectable } from '@nestjs/common';
import { PrismaService } from './point/prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prismaService: PrismaService) {}

  getHello(): string {
    return 'Hello World!';
  }

  async checkPointDbConnection(): Promise<{ status: string; message: string }> {
    try {
      await this.prismaService.$queryRaw`SELECT 1`;
      return {
        status: 'success',
        message: 'Point DBとの接続に成功しました',
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Point DBとの接続に失敗しました: ${error.message}`,
      };
    }
  }
}
