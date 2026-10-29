import { Transform } from 'class-transformer';
import { IsEmail } from 'class-validator';
import { toTrimmedString } from '../../common/dto/transformers';

export class ResendVerificationDto {
  @Transform(toTrimmedString)
  @IsEmail()
  email!: string;
}
