import {
  Controller,
  Get,
  UseGuards,
  Logger,
  Req,
  Param,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { DidService } from './did.service';
import {
  CreateManagedDIDResponseDto,
  ManagedDIDDto,
  DidOperationSubmissionDto,
} from './dto/identus';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { UserApiKeyInterceptor } from '../../common/interceptors/user-api-key.interceptor';

@Controller('did')
export class DidController {
  private readonly logger = new Logger(DidController.name);

  constructor(private readonly didService: DidService) {}

  /**
   * ユーザーのDIDを取得
   * 1ユーザー1DIDを前提として実装
   */
  @Get('')
  @UseGuards(JwtGuard, ApiKeyGuard)
  @UseInterceptors(UserApiKeyInterceptor)
  async findOne(@Req() req): Promise<ManagedDIDDto | null> {
    const userApiKey = req.headers['x-user-api-key'];
    this.logger.debug('userApiKey', userApiKey);
    const did = await this.didService.findOne(userApiKey);
    return did;
  }

  /**
   * Issuer DIDを取得
   */
  @Get('issuer')
  @UseGuards(ApiKeyGuard)
  async getIssuerDid(): Promise<ManagedDIDDto> {
    const did = await this.didService.getIssuerDid();
    return did;
  }

  /**
   * longFormDidからDIDのステータスを取得
   */
  @Get(':longFormDid')
  @UseGuards(JwtGuard, ApiKeyGuard)
  @UseInterceptors(UserApiKeyInterceptor)
  async findOneByLongFormDid(
    @Req() req,
    @Param('longFormDid') longFormDid: string,
  ): Promise<ManagedDIDDto> {
    const userApiKey = req.headers['x-user-api-key'];
    const did = await this.didService.findOneByLongFormDid(
      userApiKey,
      longFormDid,
    );
    return did;
  }

  /**
   * DIDを作成
   */
  @Post('/create')
  @UseGuards(JwtGuard, ApiKeyGuard)
  @UseInterceptors(UserApiKeyInterceptor)
  async create(@Req() req): Promise<CreateManagedDIDResponseDto> {
    const userApiKey = req.headers['x-user-api-key'];
    this.logger.debug('userApiKey', userApiKey);
    const did = await this.didService.create(userApiKey);
    return did;
  }

  /**
   * DIDを公開
   */
  @Post(':longFormDid/publish')
  @UseGuards(JwtGuard, ApiKeyGuard)
  @UseInterceptors(UserApiKeyInterceptor)
  async publish(
    @Req() req,
    @Param('longFormDid') longFormDid: string,
  ): Promise<DidOperationSubmissionDto> {
    const userApiKey = req.headers['x-user-api-key'];
    const did = await this.didService.publish(userApiKey, longFormDid);
    return did;
  }
}
