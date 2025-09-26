import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('apikey.value') || '';
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKeyFromHeader = request.headers['x-api-key'] as string;

    if (!apiKeyFromHeader) {
      throw new UnauthorizedException({
        type: '/errors/unauthorized',
        title: 'Unauthorized',
        status: 401,
        detail: 'API key is missing',
        instance: request.url,
      });
    }

    if (apiKeyFromHeader !== this.apiKey) {
      throw new UnauthorizedException({
        type: '/errors/unauthorized',
        title: 'Unauthorized',
        status: 401,
        detail: 'Invalid API key',
        instance: request.url,
      });
    }

    return true;
  }
}
