import { Transform } from 'class-transformer';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { toTrimmedString } from '../../common/dto/transformers';

export class CreateAddressDto {
  @Transform(toTrimmedString)
  @IsString()
  @MinLength(2)
  department!: string;

  @Transform(toTrimmedString)
  @IsString()
  @MinLength(2)
  province!: string;

  @Transform(toTrimmedString)
  @IsString()
  @MinLength(2)
  district!: string;

  @Transform(toTrimmedString)
  @IsString()
  @MinLength(4)
  addressLine!: string;

  @IsOptional()
  @Transform(toTrimmedString)
  @IsString()
  label?: string;

  @IsOptional()
  @Transform(toTrimmedString)
  @IsString()
  reference?: string;

  @IsOptional()
  @Transform(toTrimmedString)
  @IsString()
  phone?: string;
}
