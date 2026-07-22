import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, MaxLength, MinLength } from 'class-validator';
import { toTrimmedString } from '../../common/dto/transformers';

export class RegisterUserDto {
  @Transform(toTrimmedString)
  @IsString()
  @Length(2, 120)
  name!: string;

  @Transform(toTrimmedString)
  @IsEmail({}, { message: 'Ingresa un correo valido con dominio completo.' })
  email!: string;

  @IsString({ message: 'La contrasena es obligatoria.' })
  @MinLength(8, { message: 'La contrasena debe tener al menos 8 caracteres.' })
  @MaxLength(128)
  password!: string;

  @IsString({ message: 'La confirmacion de contrasena es obligatoria.' })
  @MinLength(8, { message: 'La confirmacion debe tener al menos 8 caracteres.' })
  @MaxLength(128)
  confirmPassword!: string;
}
