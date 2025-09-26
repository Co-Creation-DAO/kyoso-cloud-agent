import { registerAs } from '@nestjs/config';

export default registerAs('identus', () => ({
  cloudAgentUrl: process.env.IDENTUS_CLOUD_AGENT_URL,
  issuerApiKey: process.env.KYOSO_ISSUER_API_KEY,
}));
