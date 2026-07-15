import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/health/live (GET)', () =>
    request(app.getHttpServer())
      .get('/health/live')
      .expect(200)
      .expect(({ body }) =>
        expect(body).toEqual(expect.objectContaining({ status: 'ok' })),
      ));

  it('/health/ready (GET)', () =>
    request(app.getHttpServer())
      .get('/health/ready')
      .expect(200)
      .expect(({ body }) =>
        expect(body).toEqual(
          expect.objectContaining({
            status: 'ready',
            database: 'ok',
            redis: 'ok',
          }),
        ),
      ));

  it('rejects access to a protected Operations endpoint without a JWT', () =>
    request(app.getHttpServer()).get('/operations/me').expect(401));

  afterEach(async () => {
    await app.close();
  });
});
