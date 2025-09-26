import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * JWT VC Properties V1
 */
export class JwtVCPropertiesV1Dto {
  @ApiPropertyOptional({
    description:
      'The validity period in seconds of the JWT verifiable credential',
    example: 31536000,
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  validityPeriod?: number;

  @ApiPropertyOptional({
    description: 'The issuer Prism DID for JWT VC',
    example:
      'did:prism:e52a42dcc4eba159fdb934a1426d809fd0f2ad951346d70e042bddecafd1af81',
  })
  @IsOptional()
  @IsString()
  issuingDID?: string;

  @ApiPropertyOptional({
    description: 'The key ID (kid) of the DID for signing JWT VC',
    example: 'key-1',
  })
  @IsOptional()
  @IsString()
  issuingKid?: string;

  @ApiPropertyOptional({
    description: 'The claims for JWT VC',
    type: 'object',
    additionalProperties: true,
    example: {
      name: 'John Doe',
      email: 'john@example.com',
      role: 'verified_member',
    },
  })
  @IsOptional()
  @IsObject()
  claims?: Record<string, any>;
}

/**
 * AnonCreds VC Properties V1
 */
export class AnonCredsVCPropertiesV1Dto {
  @ApiPropertyOptional({
    description: 'The URL pointing to the JSON schema for AnonCreds VC',
    example: 'https://example.com/schemas/credential-schema.json',
  })
  @IsOptional()
  @IsString()
  schemaId?: string;

  @ApiPropertyOptional({
    description: 'The unique identifier of the credential definition',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  credentialDefinitionId?: string;

  @ApiPropertyOptional({
    description: 'The issuer Prism DID for AnonCreds VC',
    example:
      'did:prism:e52a42dcc4eba159fdb934a1426d809fd0f2ad951346d70e042bddecafd1af81',
  })
  @IsOptional()
  @IsString()
  issuingDID?: string;

  @ApiPropertyOptional({
    description: 'The claims for AnonCreds VC',
    type: 'object',
    additionalProperties: true,
    example: {
      name: 'John Doe',
      age: 30,
    },
  })
  @IsOptional()
  @IsObject()
  claims?: Record<string, any>;
}

/**
 * SD-JWT VC Properties V1
 */
export class SDJWTVCPropertiesV1Dto {
  @ApiPropertyOptional({
    description:
      'The validity period in seconds of the SD-JWT verifiable credential',
    example: 31536000,
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  validityPeriod?: number;

  @ApiPropertyOptional({
    description: 'The issuer Prism DID for SD-JWT VC',
    example:
      'did:prism:e52a42dcc4eba159fdb934a1426d809fd0f2ad951346d70e042bddecafd1af81',
  })
  @IsOptional()
  @IsString()
  issuingDID?: string;

  @ApiPropertyOptional({
    description: 'The key ID (kid) of the DID for signing SD-JWT VC',
    example: 'key-1',
  })
  @IsOptional()
  @IsString()
  issuingKid?: string;

  @ApiPropertyOptional({
    description: 'The claims for SD-JWT VC',
    type: 'object',
    additionalProperties: true,
    example: {
      name: 'John Doe',
      email: 'john@example.com',
    },
  })
  @IsOptional()
  @IsObject()
  claims?: Record<string, any>;
}

/**
 * Create Issue Credential Record Request DTO
 * Based on Identus CreateIssueCredentialRecordRequest specification
 */
export class CreateIssueCredentialRecordRequestDto {
  @ApiPropertyOptional({
    description:
      'The validity period in seconds of the verifiable credential (DEPRECATED: Use jwtVcPropertiesV1.validityPeriod instead)',
    example: 31536000,
    type: Number,
    deprecated: true,
  })
  @IsOptional()
  @IsNumber()
  validityPeriod?: number;

  @ApiPropertyOptional({
    description:
      'The URL pointing to the JSON schema (DEPRECATED: Use anoncredsVcPropertiesV1.schemaId instead)',
    example: 'https://example.com/schemas/credential-schema.json',
    deprecated: true,
  })
  @IsOptional()
  @IsString()
  schemaId?: string;

  @ApiPropertyOptional({
    description:
      'The unique identifier of the credential definition (DEPRECATED: Use anoncredsVcPropertiesV1.credentialDefinitionId instead)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    deprecated: true,
  })
  @IsOptional()
  @IsUUID()
  credentialDefinitionId?: string;

  @ApiPropertyOptional({
    description: 'The credential format for this offer',
    example: 'JWT',
    enum: ['JWT', 'AnonCreds', 'SDJWT'],
  })
  @IsOptional()
  @IsString()
  credentialFormat?: string;

  @ApiPropertyOptional({
    description:
      'The set of claims that will be included in the issued credential (DEPRECATED: Use specific properties)',
    type: 'object',
    additionalProperties: true,
    example: {
      name: 'John Doe',
      email: 'john@example.com',
      role: 'verified_member',
      issueDate: '2025-08-09T12:53:39.461Z',
    },
    deprecated: true,
  })
  @IsOptional()
  @IsObject()
  claims?: Record<string, any>;

  @ApiPropertyOptional({
    description:
      'Specifies whether the credential should be automatically generated and issued',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  automaticIssuance?: boolean;

  @ApiPropertyOptional({
    description: 'The issuer Prism DID (DEPRECATED: Use specific properties)',
    example:
      'did:prism:e52a42dcc4eba159fdb934a1426d809fd0f2ad951346d70e042bddecafd1af81',
    deprecated: true,
  })
  @IsOptional()
  @IsString()
  issuingDID?: string;

  @ApiPropertyOptional({
    description:
      'The key ID (kid) of the DID (DEPRECATED: Use jwtVcPropertiesV1.issuingKid instead)',
    example: 'key-1',
    deprecated: true,
  })
  @IsOptional()
  @IsString()
  issuingKid?: string;

  @ApiPropertyOptional({
    description: 'The unique identifier of a DIDComm connection',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  connectionId?: string;

  @ApiPropertyOptional({
    description: 'A self-attested code for the out-of-band message',
    example: 'PROOF_OF_ACTION',
  })
  @IsOptional()
  @IsString()
  goalCode?: string;

  @ApiPropertyOptional({
    description: 'A self-attested string about the context-specific goal',
    example: '行動証明のためのコード',
  })
  @IsOptional()
  @IsString()
  goal?: string;

  @ApiPropertyOptional({
    description: 'The intended scope or audience for the offer request',
    example: 'kyosodao.io',
  })
  @IsOptional()
  @IsString()
  domain?: string;

  @ApiPropertyOptional({
    description: 'The properties of the JWT verifiable credential',
    type: JwtVCPropertiesV1Dto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => JwtVCPropertiesV1Dto)
  jwtVcPropertiesV1?: JwtVCPropertiesV1Dto;

  @ApiPropertyOptional({
    description: 'The properties of the AnonCreds verifiable credential',
    type: AnonCredsVCPropertiesV1Dto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AnonCredsVCPropertiesV1Dto)
  anoncredsVcPropertiesV1?: AnonCredsVCPropertiesV1Dto;

  @ApiPropertyOptional({
    description: 'The properties of the SD-JWT verifiable credential',
    type: SDJWTVCPropertiesV1Dto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SDJWTVCPropertiesV1Dto)
  sdJwtVcPropertiesV1?: SDJWTVCPropertiesV1Dto;
}
