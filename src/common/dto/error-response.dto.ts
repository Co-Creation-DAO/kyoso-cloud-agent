import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional } from 'class-validator';

/**
 * RFC 7807標準のエラーレスポンス形式
 * Identus Exception FilterやJobで共通使用
 */
export class ErrorResponseDto {
  @ApiProperty({
    description: 'HTTPステータスコード',
    example: 400,
  })
  @IsNumber()
  status: number;

  @ApiProperty({
    description: 'エラーの種類を示すURI',
    example: '/errors/bad-request',
  })
  @IsString()
  type: string;

  @ApiProperty({
    description: 'エラーの簡潔なタイトル',
    example: 'Bad Request',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'エラーの詳細説明',
    example: 'Invalid request parameters',
  })
  @IsString()
  detail: string;

  @ApiProperty({
    description: 'エラーが発生したインスタンス',
    example: '/api/did/create',
    required: false,
  })
  @IsString()
  @IsOptional()
  instance?: string;
}
