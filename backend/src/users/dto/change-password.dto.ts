import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { toTrimmedString } from '../../common/dto/transformers';

export class ChangePasswordDto {
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword!: string;
}
