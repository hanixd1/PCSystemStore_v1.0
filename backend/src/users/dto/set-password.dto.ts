import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { toTrimmedString } from '../../common/dto/transformers';

export class SetPasswordDto {
  @Transform(toTrimmedString)
  @IsString()
  @MinLength(10)
  token!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  confirmPassword!: string;
}
