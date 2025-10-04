import { registerAs } from '@nestjs/config';

export default registerAs('transaction', () => ({
  blockfrostProjectId: process.env.BLOCKFROST_PROJECT_ID || 'default-project-id',
  walletMnemonic: process.env.WALLET_MNEMONIC || 'default-wallet-mnemonic',
  pointDatabaseUrl: process.env.POINT_DATABASE_URL || 'default-point-database-url',
  cardanoNetworkId: process.env.CARDANO_NETWORK_ID ? parseInt(process.env.CARDANO_NETWORK_ID, 10) : 0, // 0=preprod, 1=mainnet
}));
