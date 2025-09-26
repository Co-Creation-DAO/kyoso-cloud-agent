import { registerAs } from '@nestjs/config';

export default registerAs('firebase', () => ({
  iss: process.env.FIREBASE_ISSUER,
  aud: process.env.FIREBASE_AUDIENCE,
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY,
}));
