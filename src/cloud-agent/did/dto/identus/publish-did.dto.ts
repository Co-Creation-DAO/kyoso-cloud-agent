import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
/**
 * DID操作の予約情報
 */
export class ScheduledOperationDto {
  @ApiProperty({
    description: '操作ID',
    example: '98e6a4db10e58fcc011dd8def5ce99fd8b52af39e61e5fb436dc28259139818b',
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: '対象DIDの参照(longFormDidではなく、shortFormDidで返される)',
    example:
      'did:prism:4a5b5cf0a513e83b598bbea25cd6196746747f361a73ef77068268bc9bd732ff',
  })
  @IsString()
  @IsNotEmpty()
  didRef: string;
}

/**
 * DID操作の予約情報DTO
 */
export class DidOperationSubmissionDto {
  @ApiProperty({
    description: '予約された操作情報',
    type: ScheduledOperationDto,
  })
  @IsObject()
  @Type(() => ScheduledOperationDto)
  scheduledOperation: ScheduledOperationDto;
}
