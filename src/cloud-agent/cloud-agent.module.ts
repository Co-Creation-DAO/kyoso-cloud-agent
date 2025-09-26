import { Module } from '@nestjs/common';
import { ConnectionModule } from './connection/connection.module';
import { VcModule } from './vc/vc.module';
import { DidModule } from './did/did.module';

@Module({
  imports: [ConnectionModule, VcModule, DidModule]
})
export class CloudAgentModule {}
