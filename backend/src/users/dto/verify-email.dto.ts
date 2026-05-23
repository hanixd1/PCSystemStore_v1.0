import { Transform } from 'class-transformer';
import { IsString, MinLength } from 'class-validator';
import { toTrimmedString } from '../../common/dto/transformers';

export class VerifyEmailDto {
  @Transform(toTrimmedString)
  @IsString()
  @MinLength(10)
  token!: string;
}
