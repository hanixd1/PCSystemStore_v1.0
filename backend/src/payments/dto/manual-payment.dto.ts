import { IsIn, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class ManualPaymentDto {
  @IsUUID()
  orderId: string;

  @IsString()
  @IsIn(['YAPE', 'PLIN'])
  method: 'YAPE' | 'PLIN';

  @IsString()
  @Length(4, 40)
  operationCode: string;

  @IsOptional()
  @IsString()
  @Length(0, 240)
  customerNote?: string;
}
