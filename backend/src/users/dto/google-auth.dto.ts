import { Transform } from 'class-transformer';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { toTrimmedString } from '../../common/dto/transformers';

export class GoogleAuthDto {
  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @MinLength(20)
  idToken?: string;

  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @MinLength(20)
  credential?: string;
}
