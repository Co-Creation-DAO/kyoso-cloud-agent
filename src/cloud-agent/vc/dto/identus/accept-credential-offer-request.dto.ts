import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

/**
 * Accept Credential Offer Request DTO
 * Based on AcceptCredentialOfferRequest case class
 *
 * This DTO represents the request body for accepting a credential offer.
 * It specifies the subject DID that should receive the credential and optionally
 * the key ID to use for signing.
 */
export class AcceptCredentialOfferRequestDto {
  @ApiPropertyOptional({
    description:
      'The DID of the subject that should receive the credential. Can be either short-form or long-form DID.',
    example:
      'did:prism:6f5dc37eb33bbed9eed4eee21f57ccde3432dc10d381f90d3ee13efe12d67f23:Cq8CCqwCEjkKBWtleS0xEARKLgoJc2VjcDI1NmsxEiECNp2fEUza7cHL_PXq7sNCKHaBE_Ckjhey2m-XwlTsQywSOQoFa2V5LTIQAkouCglzZWNwMjU2azESIQPsxXEX08zm1mpyDV0Tq0J-nSwaE14Imi_M7rE6s0ruzBI7CgdtYXN0ZXIwEAFKLgoJc2VjcDI1NmsxEiEDtr3wiwqp1DkPZO7S8jS4Rjcc3hNKeAFUsJZISfCKN4gaMAoJc2VydmljZS0xEg1MaW5rZWREb21haW5zGhRodHRwczovL2t5b3NvZGFvLmlvLxpFCg5hZ2VudC1iYXNlLXVybBIQTGlua2VkUmVzb3VyY2VWMRohaHR0cDovL2NhZGR5LWRldjo4MDgwL2Nsb3VkLWFnZW50',
  })
  @IsOptional()
  @IsString()
  subjectId?: string;

  @ApiPropertyOptional({
    description:
      'The key ID to use for signing the credential request. Refers to a specific key within the subject DID.',
    example: 'key-1',
  })
  @IsOptional()
  @IsString()
  keyId?: string;
}
