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
import { ApiTags, ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { VCConnectionlessJobService } from './vc.connectionless.job.service';
import { IssueToHolderJobStatusResponseDto } from '../../dto/job/issue-to-holder.dto';
import { JobIdResponseDto } from '../../../../common/dto/job.dto';
import { IssueToHolderRequestDto } from '../../dto/job/issue-to-holder.dto';

@ApiTags('VC Jobs')
@Controller('vc/connectionless/job')
export class VCConnectionlessJobController {
  private readonly logger = new Logger(VCConnectionlessJobController.name);

  constructor(
    private readonly vcConnectionlessJobService: VCConnectionlessJobService,
  ) {}

  /**
   * VC発行ジョブを開始
   */
  @Post('issue-to-holder')
  @UseGuards(JwtGuard, ApiKeyGuard)
  @UseInterceptors(UserApiKeyInterceptor)
  async issueToHolder(
    @Req() req: any,
    @Body() body: IssueToHolderRequestDto,
  ): Promise<JobIdResponseDto> {
    const { claims } = body;
    const holderApiKey = req.userApiKey || req.headers['x-user-api-key'];

    return this.vcConnectionlessJobService.startIssueToHolderJob(
      claims,
      holderApiKey,
    );
  }

  /**
   * VC発行ジョブのステータスを取得
   */
  @Get(':jobId')
  @UseGuards(JwtGuard, ApiKeyGuard)
  @UseInterceptors(UserApiKeyInterceptor)
  @ApiOperation({
    summary: 'Get VC job status',
    description: 'Retrieves the status and progress of a VC issuance job',
  })
  @ApiResponse({
    status: 200,
    description: 'Job status retrieved successfully',
    type: IssueToHolderJobStatusResponseDto,
  })
  async getJobStatus(
    @Param('jobId') jobId: string,
  ): Promise<IssueToHolderJobStatusResponseDto> {
    this.logger.log(`Received job status request for job ${jobId}`);

    return this.vcConnectionlessJobService.getJobStatus(jobId);
  }
}
