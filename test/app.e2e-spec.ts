import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    const q1 = app.get<Queue>(getQueueToken('create-and-publish'));
    const q2 = app.get<Queue>(getQueueToken('issue-to-holder-connectionless'));
    const q3 = app.get<Queue>(getQueueToken('issue-to-holder-connection'));
    await Promise.all([q1.drain(), q2.drain(), q3.drain()]);
    await Promise.all([q1.close(), q2.close(), q3.close()]);
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect(({ text }) => {
        expect(text).toMatch(/Hello World/);
      });
  });
});
