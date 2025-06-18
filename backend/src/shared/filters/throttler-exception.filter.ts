import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class ThrottlerExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception.getStatus() === 429) {
      response.status(429).json({
        statusCode: 429,
        message:
          'Demasiadas solicitudes. Por favor, intenta nuevamente en un minuto.',
        path: request.url,
      });
    } else {
      response.status(exception.getStatus()).json(exception.getResponse());
    }
  }
}
