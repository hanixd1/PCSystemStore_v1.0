import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import multer from 'multer';

@Catch(multer.MulterError)
export class MulterUploadExceptionFilter implements ExceptionFilter {
  constructor(private readonly fileSizeMessage = 'La imagen supera el tamano maximo permitido.') {}

  catch(exception: multer.MulterError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const message = this.getMessage(exception);

    response.status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      message,
      error: 'Bad Request',
    });
  }

  private getMessage(exception: multer.MulterError) {
    if (exception.code === 'LIMIT_FILE_SIZE') {
      return this.fileSizeMessage;
    }

    if (exception.code === 'LIMIT_FILE_COUNT') {
      return 'Se supero el numero maximo de imagenes permitido.';
    }

    return 'No se pudo procesar el archivo enviado.';
  }
}
