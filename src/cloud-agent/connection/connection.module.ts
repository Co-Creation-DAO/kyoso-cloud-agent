import { Module } from '@nestjs/common';
import { ConnectionService } from './connection.service';
import { ConnectionController } from './connection.controller';
import { ConfigModule } from '@nestjs/config';
import { identusConfig } from '../../config';

@Module({
  imports: [ConfigModule.forFeature(identusConfig)],
  providers: [ConnectionService],
  controllers: [ConnectionController],
  exports: [ConnectionService],
})
export class ConnectionModule {}
