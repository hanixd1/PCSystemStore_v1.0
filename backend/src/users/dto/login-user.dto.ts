import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { toTrimmedString } from '../../common/dto/transformers';

export class LoginUserDto {
  @Transform(toTrimmedString)
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password!: string;
}
