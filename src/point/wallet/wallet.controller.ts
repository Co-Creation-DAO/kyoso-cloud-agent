import { Controller, Get, Query, HttpException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import {
  AddressResponseDto,
  BalanceResponseDto,
  UtxoResponseDto,
  MetadataResponseDto,
  MetadataQueryDto,
} from './dto';


@ApiTags('Wallet')
@Controller('point/wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('address')
  @ApiOperation({
    summary: 'ウォレットアドレスを取得',
    description: '環境変数のメモニックからCardanoアドレスを生成して返します',
  })
  @ApiResponse({
    status: 200,
    description: 'アドレス取得成功',
    type: AddressResponseDto,
  })
  async getAddress(): Promise<AddressResponseDto> {
    try {
      return { address: await this.walletService.getChangeAddress() };
    } catch (e) {
      if (e instanceof HttpException) throw e;
      throw new HttpException('アドレス取得エラー', 500);
    }
  }

  @Get('balance')
  @ApiOperation({
    summary: '残高を取得',
    description: 'ウォレットの残高をADAとLovelaceで返します',
  })
  @ApiQuery({
    name: 'address',
    required: false,
    description: 'Cardanoアドレス（省略時は環境変数のメモニックから生成）',
  })
  @ApiResponse({
    status: 200,
    description: '残高取得成功',
    type: BalanceResponseDto,
  })
  async getBalance(): Promise<BalanceResponseDto> {
    try {
      const address = await this.walletService.getChangeAddress();
      const balance = await this.walletService.getBalance();
      
      return { address, balance };
    } catch (e) {
      if (e instanceof HttpException) throw e;
      throw new HttpException('残高取得エラー', 500);
    }
  }

  @Get('utxos')
  @ApiOperation({
    summary: 'UTxOリストを取得',
    description: 'ウォレットの未使用トランザクション出力（UTxO）を取得します',
  })
  @ApiQuery({
    name: 'address',
    required: false,
    description: 'Cardanoアドレス（省略時は環境変数のメモニックから生成）',
  })
  @ApiResponse({
    status: 200,
    description: 'UTxO取得成功',
    type: UtxoResponseDto,
  })
  async getUtxos(): Promise<UtxoResponseDto> {
    try {
      const address = await this.walletService.getChangeAddress();
      const utxos = await this.walletService.getUtxos();
      return { address, utxos };
    } catch (e) {
      if (e instanceof HttpException) throw e;
      throw new HttpException('UTxO取得エラー', 500);
    }
  }

  @Get('metadata')
  @ApiOperation({
    summary: 'メタデータを取得',
    description: 'ウォレットのメタデータを取得します',
  })
  @ApiQuery({
    name: 'txHash',
    required: false,
    description: 'Cardanoアドレス（省略時は環境変数のメモニックから生成）',
  })
  @ApiResponse({
    status: 200,
    description: 'メタデータ取得成功',
    type: MetadataResponseDto,
  })
  async getMetadata(@Query() query: MetadataQueryDto): Promise<MetadataResponseDto> {
    try {
      const metadata = await this.walletService.getMetadata(query.txHash);
      return metadata;
    } catch (e) {
      if (e instanceof HttpException) throw e;
      throw new HttpException('メタデータ取得エラー', 500);
    }
  }
}