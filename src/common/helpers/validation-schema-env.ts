import Ajv from 'ajv';
import { ErrorObject } from 'ajv';

const ajv = new Ajv({ allErrors: true, useDefaults: true });

const schema = {
  type: 'object',
  properties: {
    HTTP_TIMEOUT: { type: 'string' },
    IDENTUS_API_SALT: { type: 'string' },
    FIREBASE_ISSUER: { type: 'string' },
    FIREBASE_AUDIENCE: { type: 'string' },
    FIREBASE_PROJECT_ID: { type: 'string' },
    FIREBASE_CLIENT_EMAIL: { type: 'string' },
    FIREBASE_PRIVATE_KEY: { type: 'string' },
    API_KEY: { type: 'string' },
    IDENTUS_CLOUD_AGENT_URL: { type: 'string' },
    REDIS_HOST: { type: 'string', default: 'localhost' },
    REDIS_PORT: { type: 'string', default: '6379' },
    AUTH_MODE: {
      type: 'string',
      enum: ['TEST', 'FIREBASE'],
      default: 'TEST',
    },
    BLOCKFROST_PROJECT_ID: { type: 'string' },
    WALLET_MNEMONIC: { type: 'string' },
    POINT_DATABASE_URL: { type: 'string' },
  },
  required: [
    'HTTP_TIMEOUT',
    'IDENTUS_API_SALT',
    'FIREBASE_ISSUER',
    'FIREBASE_AUDIENCE',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
    'API_KEY',
    'IDENTUS_CLOUD_AGENT_URL',
    'REDIS_HOST',
    'REDIS_PORT',
    'AUTH_MODE',
    'BLOCKFROST_PROJECT_ID',
    'WALLET_MNEMONIC',
    'POINT_DATABASE_URL',
  ],
};
const validate = ajv.compile(schema);

export const validateSchemaEnv = (
  env: Record<string, any>,
): Record<string, any> => {
  const valid = validate(env);
  if (!valid && validate.errors) {
    const errors = validate.errors
      .map((e: ErrorObject) => `${e.instancePath || ''} ${e.message || ''}`)
      .join(', ');
    console.error(`Env validation error: ${errors}`);
    process.exit(1);
  }
  return env;
};
