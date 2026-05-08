import { Transform } from 'class-transformer';
import { IsString, MinLength } from 'class-validator';
import { toTrimmedString } from '../../common/dto/transformers';

export class GoogleAuthDto {
  @Transform(toTrimmedString)
  @IsString()
  @MinLength(20)
  idToken!: string;
}
