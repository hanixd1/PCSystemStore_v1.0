import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsISO8601, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { toTrimmedString } from '../../common/dto/transformers';

export class CreateBannerDto {
  @Transform(toTrimmedString)
  @IsString()
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @Transform(toTrimmedString)
  @IsString()
  @MaxLength(240)
  subtitle?: string;

  @Transform(toTrimmedString)
  @IsString()
  @MaxLength(500)
  imageUrl!: string;

  @IsOptional()
  @Transform(toTrimmedString)
  @IsString()
  @MaxLength(500)
  mobileImageUrl?: string;

  @IsOptional()
  @Transform(toTrimmedString)
  @IsString()
  @MaxLength(500)
  linkUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Transform(toTrimmedString)
  @IsISO8601()
  startsAt?: string;

  @IsOptional()
  @Transform(toTrimmedString)
  @IsISO8601()
  endsAt?: string;
}
