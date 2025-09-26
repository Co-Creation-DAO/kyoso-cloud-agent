import { IsString, IsNumber, IsDate } from 'class-validator';

export class TransactionDto {
    @IsString()
    id: string;
    @IsString()
    from: string;
    @IsNumber()
    fromPointChange: number;
    @IsString()
    to: string;
    @IsNumber()
    toPointChange: number;
    @IsDate()
    createdAt: Date;
  }
  