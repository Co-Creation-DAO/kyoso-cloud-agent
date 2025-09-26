import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

/**
 * Accept Credential Offer Invitation DTO
 * Based on AcceptCredentialOfferInvitation case class
 *
 * This DTO represents the request body for accepting a credential offer invitation.
 * The invitation parameter contains the Base64-encoded out-of-band invitation data
 * extracted from the invitation URL (_oob parameter).
 */
export class AcceptCredentialOfferInvitationDto {
  @ApiProperty({
    description:
      'The Base64-encoded out-of-band invitation data extracted from the invitation URL',
    example:
      'eyJpZCI6IjcyY2UzYjE4LWI4NjctNDIyNi1iZDQ1LWJkOTcwZGRjZTJkZCIsInR5cGUiOiJodHRwczovL2RpZGNvbW0ub3JnL291dC1vZi1iYW5kLzIuMC9pbnZpdGF0aW9uIiwiZnJvbSI6ImRpZDpwZWVyOjIuRXo2TFNydlRhYkxiSjhXN0tHemVhNVpZSFpDU1VjUUNmRTNwYXFzR3p6TDVjN3IyNC5WejZNa3FoUGoxOERYV1lwU200b20zMWlGUWF2Uzl6aW1NZ1I2cVpXRUpQa2dubVpmLlNleUowSWpvaVpHMGlMQ0p6SWpwN0luVnlhU0k2SW1oMGRIQTZMeTlzYjJOaGJHaHZjM1E2T0RBNU1DSXNJbklpT2x0ZExDSmhJanBiSW1ScFpHTnZiVzB2ZGpJaVhYMTkiLCJib2R5Ijp7ImFjY2VwdCI6WyJkaWRjb21tL3YyIl19...',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  invitation: string;
}
