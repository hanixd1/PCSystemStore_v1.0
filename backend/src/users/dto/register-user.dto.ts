import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, MinLength } from 'class-validator';
import { toTrimmedString } from '../../common/dto/transformers';

export class RegisterUserDto {
  @Transform(toTrimmedString)
  @IsString()
  @Length(2, 120)
  name!: string;

  @Transform(toTrimmedString)
  @IsEmail({}, { message: 'Ingresa un correo valido con dominio completo.' })
  email!: string;

  @Transform(toTrimmedString)
  @IsString({ message: 'La contrasena es obligatoria.' })
  @MinLength(6, { message: 'La contrasena debe tener al menos 6 caracteres.' })
  password!: string;

  @Transform(toTrimmedString)
  @IsString({ message: 'La confirmacion de contrasena es obligatoria.' })
  @MinLength(6, { message: 'La confirmacion debe tener al menos 6 caracteres.' })
  confirmPassword!: string;
}
