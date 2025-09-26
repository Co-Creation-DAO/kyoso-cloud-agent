import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsObject,
  ValidateNested,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Issue Credential Offer Invitation DTO
 * Based on IssueCredentialOfferInvitation case class
 */
export class IssueCredentialOfferInvitationDto {
  @ApiProperty({
    description: 'The unique identifier of the invitation',
    example: '72ce3b18-b867-4226-bd45-bd970ddce2dd',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'The type of the invitation',
    example: 'https://didcomm.org/out-of-band/2.0/invitation',
  })
  @IsString()
  type: string;

  @ApiProperty({
    description: 'The DID of the inviting party',
    example:
      'did:peer:2.Ez6LSrvTabLbJ8W7KGzea5ZYHZCSUcQCfE3paqsGzzL5c7r24.Vz6MkqhPj18DXWYpSm4om31iFQavS9zimMgR6qZWEJPkgnmZf.SeyJ0IjoiZG0iLCJzIjp7InVyaSI6Imh0dHA6Ly9sb2NhbGhvc3Q6ODA5MCIsInIiOltdLCJhIjpbImRpZGNvbW0vdjIiXX19',
  })
  @IsString()
  from: string;

  @ApiProperty({
    description: 'The invitation URL containing the encoded invitation',
    example:
      'https://my.domain.com/path?_oob=eyJpZCI6IjcyY2UzYjE4LWI4NjctNDIyNi1iZDQ1LWJkOTcwZGRjZTJkZCI...',
  })
  @IsString()
  invitationUrl: string;
}

/**
 * VC Protocol State Enum
 */
export enum VCProtocolState {
  INVITATION_GENERATED = 'InvitationGenerated',
  OFFER_PENDING = 'OfferPending',
  OFFER_SENT = 'OfferSent',
  OFFER_RECEIVED = 'OfferReceived',
  REQUEST_PENDING = 'RequestPending',
  REQUEST_GENERATED = 'RequestGenerated',
  REQUEST_SENT = 'RequestSent',
  REQUEST_RECEIVED = 'RequestReceived',
  CREDENTIAL_PENDING = 'CredentialPending',
  CREDENTIAL_GENERATED = 'CredentialGenerated',
  CREDENTIAL_SENT = 'CredentialSent',
  CREDENTIAL_RECEIVED = 'CredentialReceived',
}

/**
 * VC Role Enum
 */
export enum VCRole {
  ISSUER = 'Issuer',
  HOLDER = 'Holder',
}

/**
 * Error Response for metaLastFailure
 */
export class ErrorResponseDto {
  @ApiPropertyOptional({
    description: 'Error status code',
    example: 500,
  })
  @IsOptional()
  @IsNumber()
  status?: number;

  @ApiPropertyOptional({
    description: 'Error type',
    example: 'InternalServerError',
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    description: 'Error title',
    example: 'Internal Server Error',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Error detail',
    example: 'An unexpected error occurred',
  })
  @IsOptional()
  @IsString()
  detail?: string;

  @ApiPropertyOptional({
    description: 'Error instance identifier',
    example: 'error:instance:123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  instance?: string;
}

/**
 * Issue Credential Record DTO
 * Based on IssueCredentialRecord case class
 */
export class IssueCredentialRecordDto {
  @ApiProperty({
    description: 'The unique identifier of the credential record',
    example: 'c34a78aa-ed28-43c6-a631-07538daaab7b',
  })
  @IsString()
  recordId: string;

  @ApiProperty({
    description: 'The thread identifier for the credential exchange',
    example: '72ce3b18-b867-4226-bd45-bd970ddce2dd',
  })
  @IsString()
  thid: string;

  @ApiProperty({
    description: 'The format of the verifiable credential',
    example: 'JWT',
    enum: ['JWT', 'AnonCreds', 'SDJWT'],
  })
  @IsString()
  credentialFormat: string;

  @ApiPropertyOptional({
    description:
      'The subject identifier (DID) that will receive the credential',
    example:
      'did:prism:6f5dc37eb33bbed9eed4eee21f57ccde3432dc10d381f90d3ee13efe12d67f23',
  })
  @IsOptional()
  @IsString()
  subjectId?: string;

  @ApiPropertyOptional({
    description: 'The validity period in seconds of the verifiable credential',
    example: 31536000,
  })
  @IsOptional()
  @IsNumber()
  validityPeriod?: number;

  @ApiProperty({
    description: 'The claims that will be included in the credential',
    type: 'object',
    additionalProperties: true,
    example: {
      name: 'Complete Test User',
      email: 'complete@test.com',
      role: 'verified_member',
      issueDate: '2025-08-09T12:53:39.461Z',
    },
  })
  @IsObject()
  claims: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Whether the credential should be automatically issued',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  automaticIssuance?: boolean;

  @ApiProperty({
    description: 'The timestamp when the record was created',
    example: '2025-08-09T12:53:39.599410672Z',
  })
  @IsDateString()
  createdAt: string;

  @ApiPropertyOptional({
    description: 'The timestamp when the record was last updated',
    example: '2025-08-09T12:53:40.123456789Z',
  })
  @IsOptional()
  @IsDateString()
  updatedAt?: string;

  @ApiProperty({
    description: 'The role of this agent in the credential exchange',
    enum: VCRole,
    example: VCRole.ISSUER,
  })
  @IsEnum(VCRole)
  role: VCRole;

  @ApiProperty({
    description: 'The current state of the credential exchange protocol',
    enum: VCProtocolState,
    example: VCProtocolState.INVITATION_GENERATED,
  })
  @IsEnum(VCProtocolState)
  protocolState: VCProtocolState;

  @ApiPropertyOptional({
    description: 'The issued verifiable credential (JWT format)',
    example:
      'eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJkaWQ6cHJpc206...',
  })
  @IsOptional()
  @IsString()
  credential?: string;

  @ApiPropertyOptional({
    description: 'The issuing DID used for this credential',
    example:
      'did:prism:73c0c7af5aca8509f488d4baed6ef1b08dae15715b1cbc562c32750044ad17b0',
  })
  @IsOptional()
  @IsString()
  issuingDID?: string;

  @ApiPropertyOptional({
    description: 'A self-attested code for the out-of-band message',
    example: 'PROOF_OF_ACTION',
  })
  @IsOptional()
  @IsString()
  goalCode?: string;

  @ApiPropertyOptional({
    description: 'A self-attested string about the context-specific goal',
    example: '証明可能な行動記録の発行',
  })
  @IsOptional()
  @IsString()
  goal?: string;

  @ApiPropertyOptional({
    description: 'The DID of this agent in the credential exchange',
    example:
      'did:peer:2.Ez6LSrvTabLbJ8W7KGzea5ZYHZCSUcQCfE3paqsGzzL5c7r24.Vz6MkqhPj18DXWYpSm4om31iFQavS9zimMgR6qZWEJPkgnmZf.SeyJ0IjoiZG0iLCJzIjp7InVyaSI6Imh0dHA6Ly9sb2NhbGhvc3Q6ODA5MCIsInIiOltdLCJhIjpbImRpZGNvbW0vdjIiXX19',
  })
  @IsOptional()
  @IsString()
  myDid?: string;

  @ApiPropertyOptional({
    description:
      'The invitation details for connectionless credential issuance',
    type: IssueCredentialOfferInvitationDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => IssueCredentialOfferInvitationDto)
  invitation?: IssueCredentialOfferInvitationDto;

  @ApiProperty({
    description: 'The number of retry attempts for this record',
    example: 5,
  })
  @IsNumber()
  metaRetries: number;

  @ApiPropertyOptional({
    description: 'The last error that occurred during processing',
    type: ErrorResponseDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ErrorResponseDto)
  metaLastFailure?: ErrorResponseDto;
}

/**
 * Issue Credential Record Page DTO
 * Based on IssueCredentialRecordPage case class
 */
export class IssueCredentialRecordPageDto {
  @ApiProperty({
    description: 'The list of credential records in this page',
    type: [IssueCredentialRecordDto],
  })
  @ValidateNested({ each: true })
  @Type(() => IssueCredentialRecordDto)
  contents: IssueCredentialRecordDto[];

  @ApiProperty({
    description: 'The type of resource',
    example: 'IssueCredentialRecordPage',
  })
  @IsString()
  kind: string;

  @ApiProperty({
    description: 'URI of the current page',
    example: '/issue-credentials/records?offset=0&limit=20',
  })
  @IsString()
  self: string;

  @ApiProperty({
    description: 'Base resource URI for which this is a page',
    example: '/issue-credentials/records',
  })
  @IsString()
  pageOf: string;

  @ApiPropertyOptional({
    description: 'URI of the next page, if available',
    example: '/issue-credentials/records?offset=20&limit=20',
  })
  @IsOptional()
  @IsString()
  next?: string;

  @ApiPropertyOptional({
    description: 'URI of the previous page, if available',
    example: '/issue-credentials/records?offset=0&limit=20',
  })
  @IsOptional()
  @IsString()
  previous?: string;
}
