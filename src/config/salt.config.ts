import { registerAs } from '@nestjs/config';

export default registerAs('salt', () => ({
  value: process.env.IDENTUS_API_SALT || 'default-salt',
}));
