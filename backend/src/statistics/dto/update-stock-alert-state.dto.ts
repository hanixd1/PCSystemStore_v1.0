import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { toTrimmedString } from '../../common/dto/transformers';

export const STOCK_ALERT_TYPES = ['OUT_OF_STOCK', 'LOW_STOCK'] as const;
export const STOCK_ALERT_ACTIONS = ['REVIEWED', 'DISMISSED'] as const;

export class UpdateStockAlertStateDto {
  @IsUUID()
  productId!: string;

  @IsIn(STOCK_ALERT_TYPES)
  alertType!: (typeof STOCK_ALERT_TYPES)[number];

  @IsIn(STOCK_ALERT_ACTIONS)
  action!: (typeof STOCK_ALERT_ACTIONS)[number];

  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
