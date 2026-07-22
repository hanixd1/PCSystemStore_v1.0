import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class SecurityExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SecurityExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const status = this.getStatus(exception);
    const publicMessage = this.getPublicMessage(exception, status);

    if (status === 429) {
      const retryAfter = this.getRetryAfter(exception);
      if (retryAfter) {
        response.setHeader('Retry-After', String(retryAfter));
      }
    }

    if (status >= 500) {
      const internalMessage = exception instanceof Error ? exception.message : 'Unknown error';
      this.logger.error(`${request.method} ${request.originalUrl} fallo: ${internalMessage}`);
    }

    response.status(status).json({
      statusCode: status,
      message: publicMessage,
      error: HttpStatus[status] ?? 'Error',
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
    });
  }

  private getStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    if (exception && typeof exception === 'object') {
      const candidate = exception as { status?: unknown; statusCode?: unknown };
      const value = candidate.statusCode ?? candidate.status;
      if (typeof value === 'number' && value >= 400 && value < 600) {
        return value;
      }
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getPublicMessage(exception: unknown, status: number): string | string[] {
    if (status >= 500) {
      return 'Ocurrio un error interno.';
    }
    if (status === 429) {
      return 'Demasiadas solicitudes. Intenta nuevamente mas tarde.';
    }
    if (status === 413) {
      return 'La solicitud excede el tamano permitido.';
    }
    if (!(exception instanceof HttpException)) {
      return 'Solicitud no valida.';
    }
    const payload = exception.getResponse();
    if (typeof payload === 'string') {
      return payload;
    }
    if (payload && typeof payload === 'object' && 'message' in payload) {
      const message = (payload as { message?: unknown }).message;
      if (typeof message === 'string' || Array.isArray(message)) {
        return message as string | string[];
      }
    }
    return 'Solicitud no valida.';
  }

  private getRetryAfter(exception: unknown): number | undefined {
    if (!(exception instanceof HttpException)) {
      return undefined;
    }
    const payload = exception.getResponse();
    if (payload && typeof payload === 'object' && 'retryAfterSeconds' in payload) {
      const candidate = Number((payload as { retryAfterSeconds?: unknown }).retryAfterSeconds);
      return Number.isSafeInteger(candidate) && candidate > 0 ? candidate : undefined;
    }
    return undefined;
  }
}
