import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  Logger,
  Req,
} from '@nestjs/common';
import { JwtGuard } from '../../../../common/guards/jwt.guard';
import { ApiKeyGuard } from '../../../../common/guards/api-key.guard';
import { UserApiKeyInterceptor } from '../../../../common/interceptors/user-api-key.interceptor';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { VCConnectionJobService } from './vc.connection.job.service';
import { IssueToHolderJobStatusResponseDto } from '../../dto/job/issue-to-holder.dto';
import { JobIdResponseDto } from '../../../../common/dto/job.dto';
import { IssueToHolderRequestDto } from '../../dto/job/issue-to-holder.dto';

@ApiTags('VC Jobs (Connection)')
@Controller('vc/connection/job')
export class VCConnectionJobController {
  private readonly logger = new Logger(VCConnectionJobController.name);

  constructor(private readonly jobService: VCConnectionJobService) {}

  @Post('issue-to-holder')
  @UseGuards(JwtGuard, ApiKeyGuard)
  @UseInterceptors(UserApiKeyInterceptor)
  @ApiOperation({ summary: 'Start VC issuance job (connection mode)' })
  async issueToHolder(
    @Req() req: any,
    @Body() body: IssueToHolderRequestDto,
  ): Promise<JobIdResponseDto> {
    const { claims } = body;
    const holderApiKey = req.userApiKey || req.headers['x-user-api-key'];
    return this.jobService.startIssueToHolderJob(claims, holderApiKey);
  }

  @Get(':jobId')
  @UseGuards(JwtGuard, ApiKeyGuard)
  @UseInterceptors(UserApiKeyInterceptor)
  @ApiOperation({ summary: 'Get VC issuance job status (connection mode)' })
  @ApiResponse({ status: 200, type: IssueToHolderJobStatusResponseDto })
  async getJobStatus(
    @Param('jobId') jobId: string,
  ): Promise<IssueToHolderJobStatusResponseDto> {
    return this.jobService.getJobStatus(jobId);
  }
}
