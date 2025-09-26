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
import { VcConnectionlessService } from './vc.connectionless.service';
import type {
  IssueCredentialRecordDto,
  IssueCredentialRecordPageDto,
} from '../dto/identus';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { ApiKeyGuard } from '../../../common/guards/api-key.guard';
import { UserApiKeyInterceptor } from '../../../common/interceptors/user-api-key.interceptor';
import type { IssueToHolderRequestDto } from '../dto/job/issue-to-holder.dto';

@Controller('vc/connectionless')
export class VcConnectionlessController {
  private readonly logger = new Logger(VcConnectionlessController.name);

  constructor(
    private readonly vcConnectionlessService: VcConnectionlessService,
  ) {}

  @Post('issuer-create-vc-offer')
  @UseGuards(JwtGuard, ApiKeyGuard)
  @UseInterceptors(UserApiKeyInterceptor)
  async issuerCreateVcOffer(
    @Req() req,
    @Body() body: IssueToHolderRequestDto,
  ): Promise<IssueCredentialRecordDto> {
    const record = await this.vcConnectionlessService.issuerCreateVcOffer(
      body.claims,
    );
    return record;
  }

  @Post('holder-accept-invitation')
  @UseGuards(JwtGuard, ApiKeyGuard)
  @UseInterceptors(UserApiKeyInterceptor)
  async holderAcceptInvitation(
    @Req() req,
    @Body() invitation: string,
  ): Promise<IssueCredentialRecordDto> {
    const userApiKey = req.headers['x-user-api-key'];
    const record = await this.vcConnectionlessService.holderAcceptInvitation(
      invitation,
      userApiKey,
    );
    return record;
  }

  @Post('holder-accept-offer')
  @UseGuards(JwtGuard, ApiKeyGuard)
  @UseInterceptors(UserApiKeyInterceptor)
  async holderAcceptOffer(
    @Req() req,
    @Body() body: { recordId: string; subjectId: string },
  ): Promise<IssueCredentialRecordDto> {
    const userApiKey = req.headers['x-user-api-key'];
    const record = await this.vcConnectionlessService.holderAcceptOffer(
      body.recordId,
      body.subjectId,
      userApiKey,
    );
    return record;
  }

  @Post('issuer-issue-credential')
  @UseGuards(JwtGuard, ApiKeyGuard)
  @UseInterceptors(UserApiKeyInterceptor)
  async issuerIssueCredential(
    @Req() req,
    @Body() body: { recordId: string },
  ): Promise<IssueCredentialRecordDto> {
    const record = await this.vcConnectionlessService.issuerIssueCredential(
      body.recordId,
    );
    return record;
  }
}
