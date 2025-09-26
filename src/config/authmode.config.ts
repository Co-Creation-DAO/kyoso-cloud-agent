import { registerAs } from '@nestjs/config';

export default registerAs('auth_mode', () => ({
  value: process.env.AUTH_MODE,
}));
