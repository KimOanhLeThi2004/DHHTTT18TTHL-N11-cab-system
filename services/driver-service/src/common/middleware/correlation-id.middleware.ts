import { Injectable, NestMiddleware } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void): void {
    const headerKey = 'x-correlation-id';
    const incoming = req.headers[headerKey] as string | undefined;
    const correlationId =
      req.id || (incoming && incoming.trim().length > 0 ? incoming : uuidv4());

    req.id = correlationId;
    res.setHeader(headerKey, correlationId);
    next();
  }
}
