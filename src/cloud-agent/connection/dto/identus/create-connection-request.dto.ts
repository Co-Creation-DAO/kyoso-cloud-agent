import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

/**
 * Create Connection Request DTO
 */
export class CreateConnectionRequestDto {
  @ApiProperty({
    description: 'A human readable alias for the connection',
    example: 'Peter',
  })
  @IsString()
  label: string;

  @ApiPropertyOptional({
    description:
      'A self-attested code for goalcode which can be mapped to a protocol',
    example: 'issue-vc',
  })
  @IsOptional()
  @IsString()
  goalCode?: string;

  @ApiPropertyOptional({
    description:
      'A self-attested string regarding the goal of the out-of-band invitation',
    example: 'To issue a Faber College Graduate credential',
  })
  @IsOptional()
  @IsString()
  goal?: string;
}
