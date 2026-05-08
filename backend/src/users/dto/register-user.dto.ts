import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, MinLength } from 'class-validator';
import { toTrimmedString } from '../../common/dto/transformers';

export class RegisterUserDto {
  @Transform(toTrimmedString)
  @IsString()
  @Length(2, 120)
  name!: string;

  @Transform(toTrimmedString)
  @IsEmail()
  email!: string;

  @Transform(toTrimmedString)
  @IsString()
  @MinLength(6)
  password!: string;
}
