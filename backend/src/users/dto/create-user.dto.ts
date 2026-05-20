import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, Length, MinLength } from 'class-validator';
import { USER_ROLES } from '../../auth/auth.constants';
import { toTrimmedString } from '../../common/dto/transformers';

export class CreateUserDto {
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

  @Transform(toTrimmedString)
  @IsOptional()
  @IsIn(USER_ROLES)
  role?: (typeof USER_ROLES)[number];
}
