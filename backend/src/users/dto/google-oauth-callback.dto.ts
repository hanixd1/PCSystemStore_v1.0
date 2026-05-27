import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';
import { toTrimmedString } from '../../common/dto/transformers';

export class GoogleOAuthCallbackDto {
  @Transform(toTrimmedString)
  @IsString()
  @Length(1, 4096)
  code!: string;

  @Transform(toTrimmedString)
  @IsString()
  @Length(32, 256)
  state!: string;
}
