import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SimulatePaymentDto {
  @IsUUID()
  orderId: string;

  @IsString()
  @IsIn(['CARD_CREDIT', 'CARD_DEBIT'])
  method: 'CARD_CREDIT' | 'CARD_DEBIT';

  @IsString()
  @IsIn(['APPROVED', 'REJECTED'])
  simulateResult: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  installments?: number;
}
