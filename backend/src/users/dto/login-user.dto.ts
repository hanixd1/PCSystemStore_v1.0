import { Transform } from 'class-transformer';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { toTrimmedString } from '../../common/dto/transformers';

export class LoginUserDto {
  @Transform(toTrimmedString)
  @IsEmail()
  email!: string;

  @Transform(toTrimmedString)
  @IsString()
  @MinLength(6)
  password!: string;
}
