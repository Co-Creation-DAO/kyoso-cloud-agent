import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

/**
 * ジョブID応答DTO
 */
export class JobIdResponseDto {
  @ApiProperty({
    description: 'ジョブの識別子',
    example: '1',
  })
  @IsString()
  jobId: string;
}

/**
 * ジョブステータスの列挙型
 */
export enum JobStatusEnum {
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}
