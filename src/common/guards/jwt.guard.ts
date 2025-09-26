import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

export interface JwtPayload {
  iss: string;
  aud: string;
  sub: string;
  phone_number: string;
  [key: string]: any;
}

export interface RequestWithAuth extends Request {
  user?: JwtPayload;
}

@Injectable()
export class JwtGuard implements CanActivate {
  private readonly logger = new Logger(JwtGuard.name);
  private readonly authMode: string;

  constructor(private readonly configService: ConfigService) {
    this.authMode =
      this.configService.get<string>('auth_mode.value') || 'FIREBASE';

    this.logger.log(`JwtGuard initialized with AUTH_MODE: ${this.authMode}`);

    if (this.authMode === 'FIREBASE') {
      const projectId = this.configService.get<string>('firebase.projectId');
      const clientEmail = this.configService.get<string>(
        'firebase.clientEmail',
      );
      const privateKey = this.configService.get<string>('firebase.privateKey');

      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey: privateKey?.replace(/\\n/g, '\n'),
          }),
        });
      } else {
        admin.app();
      }
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        type: '/errors/unauthorized',
        title: 'Unauthorized',
        status: 401,
        detail: 'Authorization header is missing or invalid',
        instance: request.url,
      });
    }

    const token = authHeader.split(' ')[1];

    try {
      if (this.authMode === 'TEST') {
        this.logger.log(`TEST mode: Creating dummy JWT for token: ${token}`);
        const decoded = this.createDummyJwt(token);
        request.user = decoded;
        return true;
      }

      const decodedToken = await admin.auth().verifyIdToken(token);

      const payload: JwtPayload = {
        ...decodedToken,
        iss: decodedToken.iss,
        aud: decodedToken.aud,
        sub: decodedToken.sub,
        phone_number: decodedToken.phone_number || '',
      };

      request.user = payload;
      return true;
    } catch (error) {
      throw new UnauthorizedException({
        type: '/errors/unauthorized',
        title: 'Unauthorized',
        status: 401,
        detail: 'Invalid or expired token',
        instance: request.url,
      });
    }
  }

  private createDummyJwt(token: string): JwtPayload {
    if (this.authMode !== 'TEST') {
      throw new Error('Dummy JWT is only available in TEST mode');
    }

    // Generate a consistent phone number from the token
    const phoneNumber = this.generatePhoneNumberFromToken(token);

    const dummyPayload: JwtPayload = {
      iss: 'https://securetoken.google.com/test-project',
      aud: 'test-project',
      sub: token || 'test-user-id',
      phone_number: phoneNumber,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    return dummyPayload;
  }

  private generatePhoneNumberFromToken(token: string): string {
    if (!token) {
      return '+1234567890';
    }

    // Create a hash from the token to generate consistent phone number
    const hash = crypto.createHash('sha256').update(token).digest('hex');

    // Take first 10 digits from the hash
    const digits = hash.replace(/\D/g, '').substring(0, 10);

    // Format as phone number
    return `+${digits || '1234567890'}`;
  }
}
