import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsDateString,
  IsNumber,
  IsEnum,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ErrorResponseDto } from '../../../../common/dto/error-response.dto';

/**
 * Connection Role Enum
 */
export enum ConnectionRole {
  INVITER = 'Inviter',
  INVITEE = 'Invitee',  
}

/**
 * Connection Protocol State Enum
 */
export enum ConnectionProtocolState {
  INVITATION_GENERATED = 'InvitationGenerated',
  INVITATION_RECEIVED = 'InvitationReceived',
  CONNECTION_REQUEST_PENDING = 'ConnectionRequestPending',
  CONNECTION_REQUEST_SENT = 'ConnectionRequestSent',
  CONNECTION_REQUEST_RECEIVED = 'ConnectionRequestReceived',
  CONNECTION_RESPONSE_PENDING = 'ConnectionResponsePending',
  CONNECTION_RESPONSE_SENT = 'ConnectionResponseSent',
  CONNECTION_RESPONSE_RECEIVED = 'ConnectionResponseReceived',
  PROBLEM_REPORT_PENDING = 'ProblemReportPending',
  PROBLEM_REPORT_SENT = 'ProblemReportSent',
  PROBLEM_REPORT_RECEIVED = 'ProblemReportReceived',
}

/**
 * Connection Invitation DTO
 */
export class ConnectionInvitationDto {
  @ApiProperty({
    description: 'The unique identifier of the invitation',
    example: '0527aea1-d131-3948-a34d-03af39aba8b4',
  })
  @IsUUID()
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
 * Connection DTO
 * Based on Connection case class
 */
export class ConnectionDto {
  @ApiProperty({
    description: 'The unique identifier of the connection.',
    example: '0527aea1-d131-3948-a34d-03af39aba8b4',
  })
  @IsUUID()
  connectionId: string;

  @ApiProperty({
    description:
      'The unique identifier of the thread this connection record belongs to. The value will identical on both sides of the connection (inviter and invitee)',
    example: '0527aea1-d131-3948-a34d-03af39aba8b4',
  })
  @IsString()
  thid: string;

  @ApiPropertyOptional({
    description: 'A human readable alias for the connection.',
    example: 'Peter',
  })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({
    description:
      'A self-attested code the receiver may want to display to the user or use in automatically deciding what to do with the out-of-band message.',
    example: 'issue-vc',
  })
  @IsOptional()
  @IsString()
  goalCode?: string;

  @ApiPropertyOptional({
    description:
      'A self-attested string that the receiver may want to display to the user about the context-specific goal of the out-of-band message.',
    example: 'To issue a Faber College Graduate credential',
  })
  @IsOptional()
  @IsString()
  goal?: string;

  @ApiPropertyOptional({
    description:
      'The DID representing me as the inviter or invitee in this specific connection.',
    example: 'did:peer:12345',
  })
  @IsOptional()
  @IsString()
  myDid?: string;

  @ApiPropertyOptional({
    description:
      'The DID representing the other peer as the an inviter or invitee in this specific connection.',
    example: 'did:peer:67890',
  })
  @IsOptional()
  @IsString()
  theirDid?: string;

  @ApiProperty({
    description: 'The role played by the Prism agent in the connection flow.',
    enum: ConnectionRole,
    example: ConnectionRole.INVITER,
  })
  @IsEnum(ConnectionRole)
  role: ConnectionRole;

  @ApiProperty({
    description: 'The current state of the connection protocol execution.',
    enum: ConnectionProtocolState,
    example: ConnectionProtocolState.INVITATION_GENERATED,
  })
  @IsEnum(ConnectionProtocolState)
  state: ConnectionProtocolState;

  @ApiProperty({
    description: 'The invitation for this connection',
    type: ConnectionInvitationDto,
  })
  @ValidateNested()
  @Type(() => ConnectionInvitationDto)
  invitation: ConnectionInvitationDto;

  @ApiProperty({
    description: 'The date and time the connection record was created.',
    example: '2022-03-10T12:00:00Z',
  })
  @IsDateString()
  createdAt: string;

  @ApiPropertyOptional({
    description: 'The date and time the connection record was last updated.',
    example: '2022-03-10T12:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  updatedAt?: string;

  @ApiProperty({
    description:
      'The maximum background processing attempts remaining for this record',
    example: 5,
  })
  @IsNumber()
  metaRetries: number;

  @ApiPropertyOptional({
    description: 'The last failure if any.',
    type: ErrorResponseDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ErrorResponseDto)
  metaLastFailure?: ErrorResponseDto;

  @ApiProperty({
    description: 'The reference to the connection resource.',
    example: 'https://atala-prism-products.io/connections/ABCD-1234',
  })
  @IsString()
  self: string;

  @ApiProperty({
    description: 'The type of object returned. In this case a `Connection`.',
    example: 'Connection',
  })
  @IsString()
  kind: string;
}

/**
 * Connections Page DTO
 * Based on ConnectionsPage case class
 */
export class ConnectionsPageDto {
  @ApiProperty({
    description:
      'Array of resources (Connection). A sequence of Connection resources representing the list of connections that the paginated response contains.',
    type: [ConnectionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConnectionDto)
  contents: ConnectionDto[];

  @ApiProperty({
    description:
      'A string that identifies the type of resource being returned in the response.',
    example: 'ConnectionsPage',
  })
  @IsString()
  kind: string;

  @ApiProperty({
    description:
      'The URL that uniquely identifies the resource being returned in the response.',
    example: '/cloud-agent/connections?offset=10&limit=10',
  })
  @IsString()
  self: string;

  @ApiProperty({
    description:
      'A string field indicating the type of resource that the contents field contains.',
    example: '',
  })
  @IsString()
  pageOf: string;

  @ApiPropertyOptional({
    description:
      'An optional string field containing the URL of the next page of results. If the API response does not contain any more pages, this field should be set to None.',
    example: '/cloud-agent/connections?offset=20&limit=10',
  })
  @IsOptional()
  @IsString()
  next?: string;

  @ApiPropertyOptional({
    description:
      'An optional string field containing the URL of the previous page of results. If the API response is the first page of results, this field should be set to None.',
    example: '/cloud-agent/connections?offset=0&limit=10',
  })
  @IsOptional()
  @IsString()
  previous?: string;
}

/**
 * Create Connection Request DTO
 */
export class CreateConnectionDto {
  @ApiProperty({
    description: 'A human readable alias for the connection',
    example: 'Alice',
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
