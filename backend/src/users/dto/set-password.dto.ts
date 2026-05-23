import { Transform } from 'class-transformer';
import { IsString, MinLength } from 'class-validator';
import { toTrimmedString } from '../../common/dto/transformers';

export class SetPasswordDto {
  @Transform(toTrimmedString)
  @IsString()
  @MinLength(10)
  token!: string;

  @Transform(toTrimmedString)
  @IsString()
  @MinLength(6)
  password!: string;

  @Transform(toTrimmedString)
  @IsString()
  @MinLength(6)
  confirmPassword!: string;
}
