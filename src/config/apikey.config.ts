import { registerAs } from '@nestjs/config';

export default registerAs('apikey', () => ({
  value: process.env.API_KEY,
}));
