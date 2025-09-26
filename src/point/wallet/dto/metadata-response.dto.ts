import { ApiProperty } from '@nestjs/swagger';

export class MetadataQueryDto {
  @ApiProperty({
    description: 'トランザクションハッシュ',
    example: 'def456abc789def123abc456def789abc123def456abc789def123abc456def789',
  })
  txHash: string;
}

export class MetadataResponseDto {

  @ApiProperty({
    description: 'トランザクションハッシュ',
    example: 'def456abc789def123abc456def789abc123def456abc789def123abc456def789',
  })
  txHash: string;

  @ApiProperty({
    description: 'メタデータラベル',
    example: 674,
  })
  label: number;

  @ApiProperty({
    description: 'メタデータ',
    example: '{"msg":["Invoice-No: 1234567890","Customer-No: 555-1234"]}',
  })
  json_metadata: any;
}