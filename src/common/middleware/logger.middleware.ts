import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

// Logs method, path, status code and response time for every request.
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = req;
    const start = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const ms = Date.now() - start;
      this.logger.log(`${method} ${originalUrl} ${statusCode} - ${ms}ms`);
    });

    next();
  }
}
