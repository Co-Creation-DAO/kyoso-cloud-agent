import { ApiProperty } from '@nestjs/swagger';

export class AddressResponseDto {
  @ApiProperty({
    description: 'Cardanoウォレットアドレス',
    example: 'addr_test1qz7k2w5h5j2k0r2v2m8n0p6q3r5s7t9u1v3w5x7y9a1b3c5d7e9f1',
  })
  address: string;
}