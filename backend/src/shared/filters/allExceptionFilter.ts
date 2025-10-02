import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from "@nestjs/common";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private logger = new Logger('Exceptions');
  catch(ex: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    const req = host.switchToHttp().getRequest();

    if (ex instanceof HttpException) {
      const status = ex.getStatus();
      const body = ex.getResponse();
      this.logger.error(`${req.method} ${req.url} -> ${status} ${JSON.stringify(body)}`);
      return res.status(status).json(body);
    }

    this.logger.error(`${req.method} ${req.url} -> 500`, (ex as any)?.stack ?? String(ex));
    return res.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
}

