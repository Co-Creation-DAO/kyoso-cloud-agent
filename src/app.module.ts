import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateSchemaEnv } from './common/helpers/validation-schema-env';
import {
  firebaseConfig,
  saltConfig,
  apikeyConfig,
  redisConfig,
  identusConfig,
  authModeConfig,
  transactionConfig,
} from './config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BullModule } from '@nestjs/bullmq';
import {PointModule} from './point/point.module';
import { CloudAgentModule } from './cloud-agent/cloud-agent.module';
import { PrismaModule } from './point/prisma/prisma.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      validate: validateSchemaEnv,
      load: [
        firebaseConfig,
        saltConfig,
        apikeyConfig,
        redisConfig,
        identusConfig,
        authModeConfig,
        transactionConfig,
      ],
    }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
    PrismaModule,
    PointModule,
    CloudAgentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
