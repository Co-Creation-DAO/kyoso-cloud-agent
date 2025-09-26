import { ApiProperty } from '@nestjs/swagger';
import { JobStatusEnum } from '../../../../common/dto/job.dto';
import { IssueCredentialRecordDto } from '../identus';
import { IsObject } from 'class-validator';
import { ErrorResponseDto } from 'src/common/dto/error-response.dto';

/**
 * ジョブの状態応答DTO
 */
export class IssueToHolderJobStatusResponseDto {
  @ApiProperty({
    description: 'ジョブID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'ジョブの状態',
    enum: JobStatusEnum,
    example: 'completed',
  })
  status: string;

  @ApiProperty({
    description: 'ジョブの進捗率（0-100）',
    minimum: 0,
    maximum: 100,
    example: 75,
  })
  progress: number;

  @ApiProperty({
    description: 'ジョブ完了時の結果情報',
    type: IssueCredentialRecordDto,
    required: false,
  })
  result?: IssueCredentialRecordDto;

  @ApiProperty({
    description: 'ジョブ失敗時のエラー理由',
    required: false,
    example:
      'VC発行処理中にエラーが発生しました: Holder DIDがまだ公開されていません',
  })
  failedReason?: ErrorResponseDto;
}

export class IssueToHolderRequestDto {
  @ApiProperty({
    description: 'VC内に含める証明内容（クレーム）',
    example: {
      name: '山田 太郎',
      email: 'taro@example.com',
      memberId: 'MEMBER-123456',
      membershipLevel: 'ゴールド',
      joinDate: '2023-05-15',
      expiryDate: '2024-05-14',
      organizationName: '株式会社KYOSO',
    },
    required: true,
  })
  @IsObject()
  claims: Record<string, any>;
}
