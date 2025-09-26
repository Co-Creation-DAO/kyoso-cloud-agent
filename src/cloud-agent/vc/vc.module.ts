import { Module } from '@nestjs/common';
import { VcConnectionlessController } from './connectionless/vc.connectionless.controller';
import { VcConnectionlessService } from './connectionless/vc.connectionless.service';
import { BullModule } from '@nestjs/bullmq';
import { IssueToHolderProcessor } from './connectionless/job/issue-to-holder.connectionless.processor';
import { VcConnectionService } from './connection/vc.connection.service';
import { VCConnectionJobController } from './connection/job/vc.connection.job.controller';
import { VCConnectionJobService } from './connection/job/vc.connection.job.service';
import { IssueToHolderConnectionProcessor } from './connection/job/issue-to-holder-connection.processor';
import { VCConnectionlessJobController } from './connectionless/job/vc.connectionless.job.controller';
import { VCConnectionlessJobService } from './connectionless/job/vc.connectionless.job.service';
import { HttpModule } from '@nestjs/axios';
import { DidModule } from '../did/did.module';
import { VcController } from './vc.common.controller';
import { VcCommonService } from './vc.common.service';
import { ConnectionModule } from '../connection/connection.module';

@Module({
  imports: [
    HttpModule,
    BullModule.registerQueue({ name: 'issue-to-holder-connectionless' }),
    BullModule.registerQueue({ name: 'issue-to-holder-connection' }),
    DidModule,
    ConnectionModule,
  ],
  controllers: [
    VcConnectionlessController,
    VCConnectionlessJobController,
    VCConnectionJobController,
    VcController,
  ],
  providers: [
    // connectionless
    VcConnectionlessService,
    IssueToHolderProcessor,
    VCConnectionlessJobService,
    // connection
    VcConnectionService,
    IssueToHolderConnectionProcessor,
    VCConnectionJobService,
    // common
    VcCommonService,
  ],
})
export class VcModule {}
