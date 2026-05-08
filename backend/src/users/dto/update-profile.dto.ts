import { Transform } from 'class-transformer';
import { IsEmail, IsISO8601, IsOptional, IsString, MinLength } from 'class-validator';
import { toTrimmedString } from '../../common/dto/transformers';

export class UpdateProfileDto {
  @IsOptional()
  @Transform(toTrimmedString)
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @Transform(toTrimmedString)
  @IsEmail()
  email?: string;

  @IsOptional()
  @Transform(toTrimmedString)
  @IsString()
  documentType?: string;

  @IsOptional()
  @Transform(toTrimmedString)
  @IsString()
  documentNumber?: string;

  @IsOptional()
  @Transform(toTrimmedString)
  @IsISO8601()
  birthDate?: string;

  @IsOptional()
  @Transform(toTrimmedString)
  @IsString()
  gender?: string;

  @IsOptional()
  @Transform(toTrimmedString)
  @IsString()
  mobilePhone?: string;
}
