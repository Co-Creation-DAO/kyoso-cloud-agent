import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsArray,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DIDStatus } from './did-status.dto';
/**
 * DIDの情報を表すDTO
 */
export class ManagedDIDDto {
  @ApiProperty({
    description: 'DIDの識別子',
    example:
      'did:prism:4a5b5cf0a513e83b598bbea25cd6196746747f361a73ef77068268bc9bd732ff',
  })
  @IsString()
  @IsNotEmpty()
  did: string;

  @ApiProperty({
    description:
      'DIDの長形式ID（DIDステータスがPUBLISHEDの場合には含まれません）',
    example:
      'did:prism:4a5b5cf0a513e83b598bbea25cd6196746747f361a73ef77068268bc9bd732ff:Cr4BCrsBElsKBmF1dGgtMRAEQk8KCXNlY3AyNTZrMRIg0opTuxu-zt6aRbT1tPniG4eu4CYsQPM3rrLzvzNiNgwaIIFTnyT2N4U7qCQ78qtWC3-p0el6Hvv8qxG5uuEw-WgMElwKB21hc3RlcjAQAUJPCglzZWNwMjU2azESIKhBU0eCOO6Vinz_8vhtFSAhYYqrkEXC8PHGxkuIUev8GiAydFHLXb7c22A1Uj_PR21NZp6BCDQqNq2xd244txRgsQ',
    required: false,
  })
  @IsString()
  longFormDid?: string;

  @ApiProperty({
    description: 'DIDのステータス',
    example: 'PUBLISHED',
    enum: DIDStatus,
  })
  @IsEnum(DIDStatus)
  @IsNotEmpty()
  status: string;
}

/**
 * DIDのページネーション情報を含むレスポンス
 */
export class ManagedDIDPageDto {
  @ApiProperty({
    description: '自己参照URI',
    example: 'https://api.identus.example/did-registrar/dids?offset=0&limit=10',
  })
  @IsString()
  self: string;

  @ApiProperty({
    description: 'リソースの種別',
    example: 'ManagedDIDCollection',
  })
  @IsString()
  kind: string;

  @ApiProperty({
    description: 'このページが属するコレクションのURI',
    example: 'https://api.identus.example/did-registrar/dids',
  })
  @IsString()
  pageOf: string;

  @ApiProperty({
    description: '次のページのURI（存在する場合）',
    example:
      'https://api.identus.example/did-registrar/dids?offset=10&limit=10',
    required: false,
  })
  @IsString()
  next?: string;

  @ApiProperty({
    description: '前のページのURI（存在する場合）',
    example: 'https://api.identus.example/did-registrar/dids?offset=0&limit=10',
    required: false,
  })
  @IsString()
  previous?: string;

  @ApiProperty({
    description: 'DIDのリスト',
    type: [ManagedDIDDto],
  })
  @IsArray()
  contents: ManagedDIDDto[];
}
