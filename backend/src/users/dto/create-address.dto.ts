import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { toTrimmedString } from '../../common/dto/transformers';

export class CreateAddressDto {
  @Transform(toTrimmedString)
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  department!: string;

  @Transform(toTrimmedString)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  province!: string;

  @Transform(toTrimmedString)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  district!: string;

  @Transform(toTrimmedString)
  @IsString()
  @MinLength(5)
  @MaxLength(150)
  addressLine!: string;

  @IsOptional()
  @Transform(toTrimmedString)
  @IsString()
  @MaxLength(40)
  label?: string;

  @IsOptional()
  @Transform(toTrimmedString)
  @IsString()
  @MaxLength(150)
  reference?: string;

  @IsOptional()
  @Transform(toTrimmedString)
  @IsString()
  @Matches(/^\d{9}$/, { message: 'El telefono debe tener 9 digitos' })
  phone?: string;
}
