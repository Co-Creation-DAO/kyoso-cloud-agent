import { validateSchemaEnv } from './validation-schema-env';

describe('validateSchemaEnv', () => {
  let consoleSpy: jest.SpyInstance;
  let processExitSpy: jest.SpyInstance;

  beforeEach(() => {
    // Console.error をモック化
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // process.exit をモック化
    processExitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation((code?: number) => {
        throw new Error(`Process exit called with code ${code}`);
      });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('正常な環境変数での検証', () => {
    it('should validate successfully with all required environment variables', () => {
      const validEnv = {
        HTTP_TIMEOUT: '30000',
        IDENTUS_API_SALT: 'test-salt',
        FIREBASE_ISSUER: 'https://securetoken.google.com/test-project',
        FIREBASE_AUDIENCE: 'test-project',
        FIREBASE_PROJECT_ID: 'test-project',
        FIREBASE_CLIENT_EMAIL: 'test@test-project.iam.gserviceaccount.com',
        FIREBASE_PRIVATE_KEY:
          '-----BEGIN PRIVATE KEY-----\\ntest-key\\n-----END PRIVATE KEY-----\\n',
        API_KEY: 'test-api-key',
        IDENTUS_CLOUD_AGENT_URL: 'http://localhost:8080',
        REDIS_HOST: 'localhost',
        REDIS_PORT: '6379',
        AUTH_MODE: 'TEST',
        BLOCKFROST_PROJECT_ID: 'test-project-id',
        WALLET_MNEMONIC: 'test test test test test test test test test test test test',
        POINT_DATABASE_URL: 'postgresql://postgres:postgres@localhost:5433/point?schema=public',

      };

      const result = validateSchemaEnv(validEnv);

      expect(result).toEqual(validEnv);
      expect(consoleSpy).not.toHaveBeenCalled();
      expect(processExitSpy).not.toHaveBeenCalled();
    });

    it('should apply default values for optional fields', () => {
      const envWithoutDefaults = {
        HTTP_TIMEOUT: '30000',
        IDENTUS_API_SALT: 'test-salt',
        FIREBASE_ISSUER: 'https://securetoken.google.com/test-project',
        FIREBASE_AUDIENCE: 'test-project',
        FIREBASE_PROJECT_ID: 'test-project',
        FIREBASE_CLIENT_EMAIL: 'test@test-project.iam.gserviceaccount.com',
        FIREBASE_PRIVATE_KEY:
          '-----BEGIN PRIVATE KEY-----\\ntest-key\\n-----END PRIVATE KEY-----\\n',
        API_KEY: 'test-api-key',
        IDENTUS_CLOUD_AGENT_URL: 'http://localhost:8080',
        // REDIS_HOST と REDIS_PORT を省略
        // AUTH_MODE を省略
      };

      const result = validateSchemaEnv(envWithoutDefaults);

      expect(result.REDIS_HOST).toBe('localhost');
      expect(result.REDIS_PORT).toBe('6379');
      expect(result.AUTH_MODE).toBe('TEST');
    });
  });

  describe('不正な環境変数での検証失敗', () => {
    it('should fail validation when required fields are missing', () => {
      const incompleteEnv = {
        HTTP_TIMEOUT: '30000',
        // IDENTUS_API_SALT が欠落
        FIREBASE_ISSUER: 'https://securetoken.google.com/test-project',
        // その他の必須フィールドも省略
      };

      expect(() => {
        validateSchemaEnv(incompleteEnv);
      }).toThrow('Process exit called with code 1');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Env validation error:'),
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should fail validation with empty object', () => {
      const emptyEnv = {};

      expect(() => {
        validateSchemaEnv(emptyEnv);
      }).toThrow('Process exit called with code 1');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Env validation error:'),
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should fail validation with wrong data types', () => {
      const invalidTypeEnv = {
        HTTP_TIMEOUT: 30000, // number instead of string
        IDENTUS_API_SALT: 'test-salt',
        FIREBASE_ISSUER: 'https://securetoken.google.com/test-project',
        FIREBASE_AUDIENCE: 'test-project',
        FIREBASE_PROJECT_ID: 'test-project',
        FIREBASE_CLIENT_EMAIL: 'test@test-project.iam.gserviceaccount.com',
        FIREBASE_PRIVATE_KEY:
          '-----BEGIN PRIVATE KEY-----\\ntest-key\\n-----END PRIVATE KEY-----\\n',
        API_KEY: 'test-api-key',
        IDENTUS_CLOUD_AGENT_URL: 'http://localhost:8080',
        REDIS_HOST: 'localhost',
        REDIS_PORT: '6379',
        AUTH_MODE: 'TEST',
      };

      expect(() => {
        validateSchemaEnv(invalidTypeEnv);
      }).toThrow('Process exit called with code 1');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Env validation error:'),
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('AUTH_MODE 列挙値の検証', () => {
    it('should accept valid AUTH_MODE values', () => {
      const testModes = ['TEST', 'FIREBASE'];

      testModes.forEach((mode) => {
        const validEnv = {
          HTTP_TIMEOUT: '30000',
          IDENTUS_API_SALT: 'test-salt',
          FIREBASE_ISSUER: 'https://securetoken.google.com/test-project',
          FIREBASE_AUDIENCE: 'test-project',
          FIREBASE_PROJECT_ID: 'test-project',
          FIREBASE_CLIENT_EMAIL: 'test@test-project.iam.gserviceaccount.com',
          FIREBASE_PRIVATE_KEY:
            '-----BEGIN PRIVATE KEY-----\\ntest-key\\n-----END PRIVATE KEY-----\\n',
          API_KEY: 'test-api-key',
          IDENTUS_CLOUD_AGENT_URL: 'http://localhost:8080',
          REDIS_HOST: 'localhost',
          REDIS_PORT: '6379',
          AUTH_MODE: mode,
        };

        const result = validateSchemaEnv(validEnv);
        expect(result.AUTH_MODE).toBe(mode);
        expect(consoleSpy).not.toHaveBeenCalled();
        expect(processExitSpy).not.toHaveBeenCalled();

        // スパイをリセット
        consoleSpy.mockClear();
        processExitSpy.mockClear();
      });
    });

    it('should reject invalid AUTH_MODE values', () => {
      const invalidEnv = {
        HTTP_TIMEOUT: '30000',
        IDENTUS_API_SALT: 'test-salt',
        FIREBASE_ISSUER: 'https://securetoken.google.com/test-project',
        FIREBASE_AUDIENCE: 'test-project',
        FIREBASE_PROJECT_ID: 'test-project',
        FIREBASE_CLIENT_EMAIL: 'test@test-project.iam.gserviceaccount.com',
        FIREBASE_PRIVATE_KEY:
          '-----BEGIN PRIVATE KEY-----\\ntest-key\\n-----END PRIVATE KEY-----\\n',
        API_KEY: 'test-api-key',
        IDENTUS_CLOUD_AGENT_URL: 'http://localhost:8080',
        REDIS_HOST: 'localhost',
        REDIS_PORT: '6379',
        AUTH_MODE: 'INVALID_MODE',
      };

      expect(() => {
        validateSchemaEnv(invalidEnv);
      }).toThrow('Process exit called with code 1');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Env validation error:'),
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('必須フィールドの個別検証', () => {
    const baseValidEnv = {
      HTTP_TIMEOUT: '30000',
      IDENTUS_API_SALT: 'test-salt',
      FIREBASE_ISSUER: 'https://securetoken.google.com/test-project',
      FIREBASE_AUDIENCE: 'test-project',
      FIREBASE_PROJECT_ID: 'test-project',
      FIREBASE_CLIENT_EMAIL: 'test@test-project.iam.gserviceaccount.com',
      FIREBASE_PRIVATE_KEY:
        '-----BEGIN PRIVATE KEY-----\\ntest-key\\n-----END PRIVATE KEY-----\\n',
      API_KEY: 'test-api-key',
      IDENTUS_CLOUD_AGENT_URL: 'http://localhost:8080',
      REDIS_HOST: 'localhost',
      REDIS_PORT: '6379',
      AUTH_MODE: 'TEST',
    };

    const requiredFields = [
      'HTTP_TIMEOUT',
      'IDENTUS_API_SALT',
      'FIREBASE_ISSUER',
      'FIREBASE_AUDIENCE',
      'FIREBASE_PROJECT_ID',
      'FIREBASE_CLIENT_EMAIL',
      'FIREBASE_PRIVATE_KEY',
      'API_KEY',
      'IDENTUS_CLOUD_AGENT_URL',
    ];

    requiredFields.forEach((field) => {
      it(`should fail validation when ${field} is missing`, () => {
        const incompleteEnv = { ...baseValidEnv };
        delete incompleteEnv[field];

        expect(() => {
          validateSchemaEnv(incompleteEnv);
        }).toThrow('Process exit called with code 1');

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Env validation error:'),
        );
        expect(processExitSpy).toHaveBeenCalledWith(1);

        // スパイをリセット
        consoleSpy.mockClear();
        processExitSpy.mockClear();
      });
    });
  });

  describe('エラーメッセージフォーマット', () => {
    it('should format error messages correctly', () => {
      const emptyEnv = {};

      expect(() => {
        validateSchemaEnv(emptyEnv);
      }).toThrow('Process exit called with code 1');

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const errorMessage = consoleSpy.mock.calls[0][0];
      expect(errorMessage).toContain('Env validation error:');
      expect(errorMessage).toContain('must have required property');
    });
  });
});
