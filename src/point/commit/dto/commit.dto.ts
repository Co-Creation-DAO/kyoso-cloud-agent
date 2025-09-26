import { IsInt, IsString, IsDate } from "class-validator";

export class CommitDto {
    @IsString()
    txHash: string;

    @IsInt()
    label: number;

    @IsString()
    rootHash: string;

    @IsDate()
    periodStart: Date;
    
    @IsDate()
    periodEnd: Date;

    @IsString()
    walletAddress: string;
}