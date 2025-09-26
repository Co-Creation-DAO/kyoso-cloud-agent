import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DidService } from './did.service';
import { DidController } from './did.controller';
import { BullModule } from '@nestjs/bullmq';
import { CreateAndPublishProcessor } from './job/create-and-publish.processor';
import { DidJobController } from './job/did.job.controller';
import { DidJobService } from './job/did.job.service';
import { ConfigModule } from '@nestjs/config';
import identusConfig from '../../config/identus.config';
import saltConfig from '../../config/salt.config';

@Module({
  imports: [
    HttpModule,
    BullModule.registerQueue({
      name: 'create-and-publish',
    }),
  ],
  controllers: [DidController, DidJobController],
  providers: [DidService, CreateAndPublishProcessor, DidJobService],
  exports: [DidService],
})
export class DidModule {}
