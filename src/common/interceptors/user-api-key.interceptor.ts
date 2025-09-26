import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { RequestWithAuth } from '../guards/jwt.guard';

@Injectable()
export class UserApiKeyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(UserApiKeyInterceptor.name);
  private readonly salt: string;

  constructor(private readonly configService: ConfigService) {
    this.salt = this.configService.get<string>('salt.identus_api_salt') || '';
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<RequestWithAuth>();

    // Generate userApiKey and add it to the request object for use in controllers
    if (request.user) {
      const userApiKey = this.generateUserApiKey(request.user);
      this.logger.log(`Generated userApiKey for user: ${request.user.sub}`);

      // Add userApiKey to request for controller access
      (request as any).userApiKey = userApiKey;

      // Also add to headers for backward compatibility
      request.headers = {
        ...request.headers,
        'x-user-api-key': userApiKey,
      };
    }

    return next.handle();
  }

  private generateUserApiKey(claims: any): string {
    const data = `${claims.iss}|${claims.aud}|${claims.sub}|${claims.phone_number || ''}`;
    const hmac = crypto.createHmac('sha256', this.salt);
    hmac.update(data);
    return hmac.digest('hex');
  }
}
