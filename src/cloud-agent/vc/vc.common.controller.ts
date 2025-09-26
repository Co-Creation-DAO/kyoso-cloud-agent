import {
  Controller,
  Get,
  UseGuards,
  Logger,
  Req,
  Param,
  Post,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { VcCommonService } from './vc.common.service';
import {
  IssueCredentialRecordDto,
  IssueCredentialRecordPageDto,
} from './dto/identus';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { UserApiKeyInterceptor } from '../../common/interceptors/user-api-key.interceptor';

@Controller('vc')
export class VcController {
  private readonly logger = new Logger(VcController.name);

  constructor(private readonly vcCommonService: VcCommonService) {}

  @Get('')
  @UseGuards(JwtGuard, ApiKeyGuard)
  @UseInterceptors(UserApiKeyInterceptor)
  async findAll(@Req() req): Promise<IssueCredentialRecordPageDto> {
    const userApiKey = req.headers['x-user-api-key'];
    const records = await this.vcCommonService.findAll(userApiKey);
    return records;
  }

  @Get(':recordId')
  @UseGuards(JwtGuard, ApiKeyGuard)
  @UseInterceptors(UserApiKeyInterceptor)
  async findOne(
    @Req() req,
    @Param('recordId') recordId: string,
  ): Promise<IssueCredentialRecordDto> {
    const userApiKey = req.headers['x-user-api-key'];
    const record = await this.vcCommonService.findOneByRecordId(
      recordId,
      userApiKey,
    );
    return record;
  }
}
