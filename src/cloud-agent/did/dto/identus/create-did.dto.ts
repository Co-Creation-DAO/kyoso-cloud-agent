import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
/**
 * DID作成レスポンス（新形式）
 */
export class CreateManagedDIDResponseDto {
  @ApiProperty({
    description: 'DIDの長期ID',
    example:
      'did:prism:4a5b5cf0a513e83b598bbea25cd6196746747f361a73ef77068268bc9bd732ff:Cr4BCrsBElsKBmF1dGgtMRAEQk8KCXNlY3AyNTZrMRIg0opTuxu-zt6aRbT1tPniG4eu4CYsQPM3rrLzvzNiNgwaIIFTnyT2N4U7qCQ78qtWC3-p0el6Hvv8qxG5uuEw-WgMElwKB21hc3RlcjAQAUJPCglzZWNwMjU2azESIKhBU0eCOO6Vinz_8vhtFSAhYYqrkEXC8PHGxkuIUev8GiAydFHLXb7c22A1Uj_PR21NZp6BCDQqNq2xd244txRgsQ',
  })
  @IsString()
  @IsNotEmpty()
  longFormDid: string;
}
