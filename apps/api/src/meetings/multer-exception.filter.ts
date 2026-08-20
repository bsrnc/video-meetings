import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  PayloadTooLargeException,
} from '@nestjs/common';
import type { Response } from 'express';

// NestJS's FileInterceptor internally converts multer's raw MulterError
// into an HttpException before it can ever reach a Nest exception filter
// (see @nestjs/platform-express/multer/multer/multer.utils.js:transformException
// — LIMIT_FILE_SIZE becomes PayloadTooLargeException with multer's own raw
// English message). Catching MulterError directly here would never fire;
// this filter exists only to replace that raw message with a clear one.
@Catch(PayloadTooLargeException)
export class MulterExceptionFilter implements ExceptionFilter {
  catch(_exception: PayloadTooLargeException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    response.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
      statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
      message: 'Файл записи превышает допустимый размер',
    });
  }
}
