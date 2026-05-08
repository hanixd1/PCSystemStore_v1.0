import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional } from 'class-validator';
import { toTrimmedString } from '../../common/dto/transformers';

export class ForgotPasswordDto {
  @Transform(toTrimmedString)
  @IsEmail()
  email!: string;

  @Transform(toTrimmedString)
  @IsOptional()
  @IsIn(['client', 'admin'])
  flow?: 'client' | 'admin';
}
