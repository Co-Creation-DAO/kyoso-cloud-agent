/** @jest-environment setup-polly-jest/jest-environment-node */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
// setup-polly-jest を使用

const { setupPolly } = require('setup-polly-jest');

const { Polly } = require('@pollyjs/core');

const NodeHttpAdapterModule = require('@pollyjs/adapter-node-http');

const FSPersisterModule = require('@pollyjs/persister-fs');
const NodeHttpAdapter = NodeHttpAdapterModule.default || NodeHttpAdapterModule;
const FSPersister = FSPersisterModule.default || FSPersisterModule;
// 明示的に登録（環境依存のdefault解決を吸収）
Polly.register(NodeHttpAdapter);
Polly.register(FSPersister);

jest.setTimeout(300_000);

describe('End-to-End: issuer確認 -> DID作成/公開 -> VC発行 (connectionless)', () => {
  let app: INestApplication;
  let apiKey: string;
  const bearerToken = `e2e-user-${Date.now()}`;
  let baseUrl: string;

  // 各テストでPollyコンテキストを用意
  const context = setupPolly({
    adapters: [NodeHttpAdapter],
    persister: FSPersister,
    mode: (process.env.POLLY_MODE || 'replay') as 'record' | 'replay',
    recordIfMissing: (process.env.POLLY_MODE || 'replay') === 'record',
    recordFailedRequests: true,
    persisterOptions: {
      fs: { recordingsDir: 'test/recordings/e2e' },
    },
    matchRequestsBy: { headers: false },
  });

  beforeAll(async () => {
    process.env.AUTH_MODE = 'TEST';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    // 自前APIのHTTPトラフィックもPollyで録音するため、実ポートでlistenしURL経由で叩く
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
    baseUrl = baseUrl.replace('[::1]', '127.0.0.1');

    // 実際にアプリが参照するAPIキーを取得
    const config = app.get(ConfigService);
    apiKey =
      config.get<string>('apikey.value') ||
      process.env.API_KEY ||
      'kyoso-api-key-123456';
  });

  afterAll(async () => {
    const q1 = app.get<Queue>(getQueueToken('create-and-publish'));
    const q2 = app.get<Queue>(getQueueToken('issue-to-holder-connectionless'));
    const q3 = app.get<Queue>(getQueueToken('issue-to-holder-connection'));
    await Promise.all([q1.drain(), q2.drain(), q3.drain()]);
    await Promise.all([q1.close(), q2.close(), q3.close()]);
    await app.close();
  });

  beforeEach(() => {
    const { server } = context.polly!;
    // 外部HTTP呼び出し（Cloud Agentなど）を録音対象にするため、localhost系のpassthroughは設定しない
  });

  it('Step1: /did/issuer を実行してIssuer DIDを確認（必要なら作成/公開完了まで待機）', async () => {
    const res = await request(baseUrl)
      .get('/did/issuer')
      .set('x-api-key', apiKey)
      .expect(200);

    expect(res.body).toHaveProperty('did');
    expect(res.body).toHaveProperty('status');

    if (res.body.status !== 'PUBLISHED') {
      const published = await waitForJobStatus(
        () => request(baseUrl).get('/did/issuer').set('x-api-key', apiKey),
        (body) => body.status === 'PUBLISHED',
        40,
        5_000,
      );
      expect(published.status).toBe('PUBLISHED');
    }
  });

  it('Step2: /did/job/create-and-publish -> /did/job/{jobId} でユーザーDIDを作成/公開', async () => {
    const startJob = await request(baseUrl)
      .post('/did/job/create-and-publish')
      .set('x-api-key', apiKey)
      .set('Authorization', `Bearer ${bearerToken}`)
      .expect(201);

    const jobId = startJob.body.jobId as string;
    expect(jobId).toBeDefined();

    const status = await waitForJobStatus(
      () =>
        request(baseUrl)
          .get(`/did/job/${jobId}`)
          .set('x-api-key', apiKey)
          .set('Authorization', `Bearer ${bearerToken}`),
      (body) => body.status === 'completed',
      30,
      5_000,
    );

    expect(status.status).toBe('completed');
    expect(status.result).toBeDefined();
    expect(status.result.did).toBeDefined();
  });

  it('Step3: /vc/connectionless/job/issue-to-holder -> /vc/connectionless/job/{jobId} でVC発行', async () => {
    const claims = {
      name: '山田 太郎',
      email: `taro+${Date.now()}@example.com`,
      memberId: `MEM-${Date.now()}`,
    };

    const startJob = await request(baseUrl)
      .post('/vc/connectionless/job/issue-to-holder')
      .set('x-api-key', apiKey)
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ claims })
      .expect(201);

    const jobId = (startJob.body.jobId || startJob.body.id) as string;
    expect(jobId).toBeDefined();

    const status = await waitForJobStatus(
      () =>
        request(baseUrl)
          .get(`/vc/connectionless/job/${jobId}`)
          .set('x-api-key', apiKey)
          .set('Authorization', `Bearer ${bearerToken}`),
      (body) => body.status === 'completed',
      40,
      5_000,
    );

    expect(status.status).toBe('completed');
    expect(status.result).toBeDefined();
  });
});

type BodyPredicate = (body: any) => boolean;

async function waitForJobStatus(
  fetcher: () => request.Test,
  isDone: BodyPredicate,
  maxTries: number,
  intervalMs: number,
) {
  for (let i = 0; i < maxTries; i++) {
    const res = await fetcher().expect(200);
    if (isDone(res.body)) return res.body;
    if (i < maxTries - 1) await delay(intervalMs);
  }
  throw new Error('Timeout waiting for job to complete');
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
