import { IsArray, IsString } from "class-validator";
import { IsEnum } from "class-validator";
import { IsNumber } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export enum VerifyStatus {
    VERIFIED = 'verified',
    NOT_VERIFIED = 'not_verified',
}

export class VerifyRequestDto {
    @ApiProperty({
        description: 'トランザクションIDの配列',
        example: ['tx_1', 'tx_2', 'tx_3'],
    })
    @IsArray()
    @IsString({ each: true })
    txIds: string[];
}

export class VerifyResponseDto {
    @ApiProperty({
        description: '検証ステータス',
        example: VerifyStatus.VERIFIED,
    })
    @IsEnum(VerifyStatus)
    status: VerifyStatus;
    @ApiProperty({
        description: 'トランザクションID',
        example: 'tx_1',
    })
    @IsString()
    txId: string;
    @ApiProperty({
        description: 'トランザクションハッシュ',
        example: 'tx_1',
    })
    @IsString()
    transactionHash: string;
    @ApiProperty({
        description: 'ルートハッシュ',
        example: 'tx_1',
    })
    @IsString()
    rootHash: string;
    @ApiProperty({
        description: 'ラベル',
        example: 1,
    })
    @IsNumber()
    label: number;
}