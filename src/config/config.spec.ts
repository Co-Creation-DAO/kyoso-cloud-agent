import firebaseConfig from './firebase.config';
import identusConfig from './identus.config';
import redisConfig from './redis.config';
import saltConfig from './salt.config';
import apikeyConfig from './apikey.config';

describe('Config Modules', () => {
  // 環境変数のバックアップ
  const originalEnv = process.env;

  beforeEach(() => {
    // 各テストで環境変数をリセット
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // 環境変数を復元
    process.env = originalEnv;
  });

  describe('Firebase設定', () => {
    it('should load Firebase configuration from environment variables', () => {
      // テスト用環境変数を設定
      process.env.FIREBASE_ISSUER =
        'https://securetoken.google.com/test-project';
      process.env.FIREBASE_AUDIENCE = 'test-project';
      process.env.FIREBASE_PROJECT_ID = 'test-project';
      process.env.FIREBASE_CLIENT_EMAIL =
        'test@test-project.iam.gserviceaccount.com';
      process.env.FIREBASE_PRIVATE_KEY =
        '-----BEGIN PRIVATE KEY-----\\ntest-key\\n-----END PRIVATE KEY-----\\n';

      const config = firebaseConfig();

      expect(config).toEqual({
        iss: 'https://securetoken.google.com/test-project',
        aud: 'test-project',
        projectId: 'test-project',
        clientEmail: 'test@test-project.iam.gserviceaccount.com',
        privateKey:
          '-----BEGIN PRIVATE KEY-----\\ntest-key\\n-----END PRIVATE KEY-----\\n',
      });
    });

    it('should handle missing Firebase environment variables', () => {
      // 環境変数をクリア
      delete process.env.FIREBASE_ISSUER;
      delete process.env.FIREBASE_AUDIENCE;
      delete process.env.FIREBASE_PROJECT_ID;
      delete process.env.FIREBASE_CLIENT_EMAIL;
      delete process.env.FIREBASE_PRIVATE_KEY;

      const config = firebaseConfig();

      expect(config).toEqual({
        iss: undefined,
        aud: undefined,
        projectId: undefined,
        clientEmail: undefined,
        privateKey: undefined,
      });
    });

    it('should register with correct namespace', () => {
      // registerAs で正しい名前空間が設定されているかを確認
      expect(firebaseConfig.KEY).toBe('CONFIGURATION(firebase)');
    });
  });

  describe('Identus設定', () => {
    it('should load Identus configuration from environment variables', () => {
      process.env.IDENTUS_CLOUD_AGENT_URL = 'https://test-agent.example.com';
      process.env.KYOSO_ISSUER_API_KEY = 'test-issuer-api-key';

      const config = identusConfig();

      expect(config).toEqual({
        cloudAgentUrl: 'https://test-agent.example.com',
        issuerApiKey: 'test-issuer-api-key',
      });
    });

    it('should handle missing Identus environment variables', () => {
      delete process.env.IDENTUS_CLOUD_AGENT_URL;
      delete process.env.KYOSO_ISSUER_API_KEY;

      const config = identusConfig();

      expect(config).toEqual({
        cloudAgentUrl: undefined,
        issuerApiKey: undefined,
      });
    });

    it('should register with correct namespace', () => {
      expect(identusConfig.KEY).toBe('CONFIGURATION(identus)');
    });
  });

  describe('Redis設定', () => {
    it('should load Redis configuration from environment variables', () => {
      process.env.REDIS_HOST = 'redis.example.com';
      process.env.REDIS_PORT = '6380';

      const config = redisConfig();

      expect(config).toEqual({
        host: 'redis.example.com',
        port: 6380,
      });
    });

    it('should use default values when environment variables are not set', () => {
      delete process.env.REDIS_HOST;
      delete process.env.REDIS_PORT;

      const config = redisConfig();

      expect(config).toEqual({
        host: 'localhost',
        port: 6379,
      });
    });

    it('should handle invalid port number', () => {
      process.env.REDIS_HOST = 'localhost';
      process.env.REDIS_PORT = 'invalid';

      const config = redisConfig();

      expect(config).toEqual({
        host: 'localhost',
        port: NaN, // parseInt('invalid', 10) returns NaN
      });
    });

    it('should parse port as integer', () => {
      process.env.REDIS_HOST = 'localhost';
      process.env.REDIS_PORT = '6380';

      const config = redisConfig();

      expect(config.port).toBe(6380);
      expect(typeof config.port).toBe('number');
    });

    it('should register with correct namespace', () => {
      expect(redisConfig.KEY).toBe('CONFIGURATION(redis)');
    });
  });

  describe('Salt設定', () => {
    it('should load salt configuration from environment variable', () => {
      process.env.IDENTUS_API_SALT = 'custom-salt-value';

      const config = saltConfig();

      expect(config).toEqual({
        value: 'custom-salt-value',
      });
    });

    it('should use default salt when environment variable is not set', () => {
      delete process.env.IDENTUS_API_SALT;

      const config = saltConfig();

      expect(config).toEqual({
        value: 'default-salt',
      });
    });

    it('should register with correct namespace', () => {
      expect(saltConfig.KEY).toBe('CONFIGURATION(salt)');
    });
  });

  describe('APIキー設定', () => {
    it('should load API key configuration from environment variable', () => {
      process.env.API_KEY = 'test-api-key-value';

      const config = apikeyConfig();

      expect(config).toEqual({
        value: 'test-api-key-value',
      });
    });

    it('should handle missing API key environment variable', () => {
      delete process.env.API_KEY;

      const config = apikeyConfig();

      expect(config).toEqual({
        value: undefined,
      });
    });

    it('should register with correct namespace', () => {
      expect(apikeyConfig.KEY).toBe('CONFIGURATION(apikey)');
    });
  });

  describe('設定の統合テスト', () => {
    it('should load all configurations without conflicts', () => {
      // 全ての環境変数を設定
      process.env.FIREBASE_ISSUER = 'https://securetoken.google.com/test';
      process.env.FIREBASE_AUDIENCE = 'test';
      process.env.FIREBASE_PROJECT_ID = 'test';
      process.env.FIREBASE_CLIENT_EMAIL = 'test@test.iam.gserviceaccount.com';
      process.env.FIREBASE_PRIVATE_KEY =
        '-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----\\n';
      process.env.IDENTUS_CLOUD_AGENT_URL = 'https://agent.example.com';
      process.env.KYOSO_ISSUER_API_KEY = 'issuer-key';
      process.env.REDIS_HOST = 'redis-host';
      process.env.REDIS_PORT = '6380';
      process.env.IDENTUS_API_SALT = 'test-salt';
      process.env.API_KEY = 'test-api-key';

      // 全ての設定を読み込み
      const firebase = firebaseConfig();
      const identus = identusConfig();
      const redis = redisConfig();
      const salt = saltConfig();
      const apikey = apikeyConfig();

      // 全ての設定が正しく読み込まれることを確認
      expect(firebase.iss).toBe('https://securetoken.google.com/test');
      expect(identus.cloudAgentUrl).toBe('https://agent.example.com');
      expect(redis.host).toBe('redis-host');
      expect(redis.port).toBe(6380);
      expect(salt.value).toBe('test-salt');
      expect(apikey.value).toBe('test-api-key');
    });

    it('should have unique namespaces for all configurations', () => {
      const namespaces = [
        firebaseConfig.KEY,
        identusConfig.KEY,
        redisConfig.KEY,
        saltConfig.KEY,
        apikeyConfig.KEY,
      ];

      // 全ての名前空間が一意であることを確認
      const uniqueNamespaces = [...new Set(namespaces)];
      expect(uniqueNamespaces).toHaveLength(namespaces.length);
      expect(uniqueNamespaces).toEqual([
        'CONFIGURATION(firebase)',
        'CONFIGURATION(identus)',
        'CONFIGURATION(redis)',
        'CONFIGURATION(salt)',
        'CONFIGURATION(apikey)',
      ]);
    });

    it('should handle mixed environment states', () => {
      // 一部の環境変数のみ設定
      process.env.FIREBASE_ISSUER = 'https://securetoken.google.com/test';
      process.env.REDIS_HOST = 'custom-redis';
      process.env.IDENTUS_API_SALT = 'custom-salt';
      // その他は未設定

      const firebase = firebaseConfig();
      const identus = identusConfig();
      const redis = redisConfig();
      const salt = saltConfig();
      const apikey = apikeyConfig();

      // 設定された値
      expect(firebase.iss).toBe('https://securetoken.google.com/test');
      expect(redis.host).toBe('custom-redis');
      expect(salt.value).toBe('custom-salt');

      // 未設定の値
      expect(firebase.aud).toBeUndefined();
      expect(identus.cloudAgentUrl).toBeUndefined();
      expect(apikey.value).toBeUndefined();

      // デフォルト値
      expect(redis.port).toBe(6379); // REDIS_PORT が未設定なのでデフォルト値
    });
  });
});
