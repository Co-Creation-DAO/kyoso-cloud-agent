import {
  Controller,
  Post,
  Get,
  Param,
  Req,
  UseGuards,
  UseInterceptors,
  Logger,
} from '@nestjs/common';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { ApiKeyGuard } from '../../../common/guards/api-key.guard';
import { UserApiKeyInterceptor } from '../../../common/interceptors/user-api-key.interceptor';
import { JobIdResponseDto } from '../../../common/dto/job.dto';
import { CreateAndPublishJobStatusResponseDto } from '../dto/job/create-and-publish.dto';
import { DidJobService } from './did.job.service';
import { ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

@ApiTags('DID Jobs')
@Controller('did/job')
export class DidJobController {
  private readonly logger = new Logger(DidJobController.name);

  constructor(
    private readonly didJobService: DidJobService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * DID作成と公開のジョブを開始
   */
  @Post('create-and-publish')
  @UseGuards(JwtGuard, ApiKeyGuard)
  @UseInterceptors(UserApiKeyInterceptor)
  async createAndPublish(@Req() req: any): Promise<JobIdResponseDto> {
    const userApiKey = req.userApiKey || req.headers['x-user-api-key'];

    this.logger.log(
      `Received create-and-publish request for userApiKey: ${userApiKey}`,
    );

    return this.didJobService.startCreateAndPublishJob(userApiKey);
  }

  /**
   * ジョブのステータスを取得
   */
  @Get(':jobId')
  @UseGuards(JwtGuard, ApiKeyGuard)
  @UseInterceptors(UserApiKeyInterceptor)
  async getJobStatus(
    @Param('jobId') jobId: string,
    @Req() req: any,
  ): Promise<CreateAndPublishJobStatusResponseDto> {
    const userApiKey = req.userApiKey || req.headers['x-user-api-key'];

    this.logger.log(`Received job status request for job ${jobId}`);

    return this.didJobService.getJobStatus(jobId, userApiKey);
  }
}
