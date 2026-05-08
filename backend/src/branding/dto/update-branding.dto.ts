import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { toTrimmedString } from '../../common/dto/transformers';

export class UpdateBrandingDto {
  @IsOptional()
  @Transform(toTrimmedString)
  @IsString()
  @MaxLength(80)
  storeName?: string;

  @IsOptional()
  @Transform(toTrimmedString)
  @IsString()
  @MaxLength(500)
  logoUrl?: string;

  @IsOptional()
  @Transform(toTrimmedString)
  @IsString()
  @MaxLength(120)
  logoAlt?: string;
}
