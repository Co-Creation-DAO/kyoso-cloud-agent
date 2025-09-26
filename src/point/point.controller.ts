import { Controller, Body } from '@nestjs/common';
import { Post, HttpCode, HttpStatus } from '@nestjs/common';
import { CommitService } from './commit/commit.service';
import { VerifyService } from './verify/verify.service';
import { VerifyRequestDto } from './verify/dto/verify.dto';

@Controller('point')
export class PointController {
    constructor(
        private readonly commitService: CommitService,
        private readonly verifyService: VerifyService) {}

    @Post('commit')
    @HttpCode(HttpStatus.OK)
    async commit() {
        return this.commitService.commit();
    }

    @Post('verify')
    @HttpCode(HttpStatus.OK)
    async verifyTx(@Body() body: VerifyRequestDto) {
        return this.verifyService.verifyTxIds(body.txIds);
    }
}


