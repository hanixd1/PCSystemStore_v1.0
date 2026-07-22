import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { toTrimmedString } from '../../common/dto/transformers';

export class ResetPasswordDto {
  @Transform(toTrimmedString)
  @IsString()
  @MinLength(10)
  token!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword!: string;
}
