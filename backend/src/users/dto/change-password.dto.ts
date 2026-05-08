import { Transform } from 'class-transformer';
import { IsString, MinLength } from 'class-validator';
import { toTrimmedString } from '../../common/dto/transformers';

export class ChangePasswordDto {
  @Transform(toTrimmedString)
  @IsString()
  @MinLength(6)
  currentPassword!: string;

  @Transform(toTrimmedString)
  @IsString()
  @MinLength(6)
  newPassword!: string;
}
