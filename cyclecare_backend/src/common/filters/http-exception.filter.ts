import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    
    const status = 
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
        
    const exceptionResponse: any = 
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error' };

    const message = exceptionResponse.message || exceptionResponse;

    response
      .status(status)
      .json({
        success: false,
        error: {
          code: status,
          message: message,
          statusCode: status,
        }
      });
  }
}
