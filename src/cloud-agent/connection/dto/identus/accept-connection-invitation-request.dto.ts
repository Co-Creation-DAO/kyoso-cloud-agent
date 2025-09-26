import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

/**
 * Accept Connection Invitation Request DTO
 */
export class AcceptConnectionInvitationRequestDto {
  @ApiProperty({
    description: 'The base64 encoded invitation',
    example: 'eyJAaWQiOiIxMjM...',
  })
  @IsString()
  invitation: string;
}
