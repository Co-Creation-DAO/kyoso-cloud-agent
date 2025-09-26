import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsObject,
  IsEnum,
} from 'class-validator';
import { ManagedDIDDto } from '../identus/managed-did.dto';
import { ErrorResponseDto } from '../../../../common/dto/error-response.dto';
import { JobStatusEnum } from '../../../../common/dto/job.dto';

/**
 * ジョブステータス応答DTO
 */
export class CreateAndPublishJobStatusResponseDto {
  @ApiProperty({
    description: 'ジョブの識別子',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'ジョブのステータス',
    example: 'completed',
    enum: JobStatusEnum,
  })
  @IsEnum(JobStatusEnum)
  status: string;

  @ApiProperty({
    description: 'ジョブの進捗率（0-100）',
    example: 75,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  progress: number;

  @ApiProperty({
    description: 'ジョブの処理結果（成功時のみ）',
    type: ManagedDIDDto,
    required: false,
  })
  @IsObject()
  @IsOptional()
  result?: ManagedDIDDto;

  @ApiProperty({
    description: '失敗時の理由（失敗時のみ）',
    example: 'DID作成中にエラーが発生しました',
    required: false,
  })
  @IsString()
  @IsOptional()
  failedReason?: ErrorResponseDto;
}
