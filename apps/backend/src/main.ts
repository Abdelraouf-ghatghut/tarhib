import 'dotenv/config';

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { EmptyStringToUndefinedPipe } from './common/pipes/empty-string-to-undefined.pipe';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { isAllowedOrigin } from './common/cors-origin';
import { MetricsService } from './metrics/metrics.service';
import { createMetricsMiddleware } from './metrics/metrics.middleware';
import { RedisIoAdapter } from './notifications/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Phase 3 — adaptateur Redis Socket.IO : condition nécessaire pour que le
  // temps réel (emitOrderUpdate) fonctionne correctement avec plusieurs
  // instances backend derrière un load balancer (voir redis-io.adapter.ts).
  // Sans impact sur un déploiement à une seule instance (le pub/sub Redis
  // ne fait alors que passer par lui-même).
  const configService = app.get(ConfigService);
  const redisIoAdapter = new RedisIoAdapter(
    app,
    configService.get<string>('REDIS_URL', 'redis://localhost:6379'),
    new Logger('RedisIoAdapter'),
  );
  redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  // PR-2.1 : middleware Express, pas un intercepteur Nest — doit tourner
  // AVANT les Guards pour aussi capturer les 401/403/429 (voir
  // metrics.middleware.ts).
  app.use(createMetricsMiddleware(app.get(MetricsService)));

  app.use(cookieParser());
  // CSP désactivée : cette API ne sert pas de HTML applicatif (Swagger UI
  // excepté, dont le script inline serait bloqué par une CSP par défaut) —
  // le CSP du contenu servi au navigateur est du ressort du Web Admin (§17).
  app.use(helmet({ contentSecurityPolicy: false }));
  app.useGlobalFilters(new AllExceptionsFilter());

  // credentials:true est requis pour le cookie de refresh HttpOnly — incompatible
  // avec origin:'*', d'où la liste blanche configurable (cf. common/cors-origin.ts,
  // partagée avec le gateway WebSocket)
  app.enableCors({
    origin: (
      origin: string | undefined,
      cb: (err: Error | null, allow?: boolean) => void,
    ) => cb(null, isAllowedOrigin(origin)),
    credentials: true,
  });

  app.useGlobalPipes(
    // "" → undefined AVANT la validation : les champs optionnels vidés par un
    // formulaire ne déclenchent plus de faux 400 « must be a UUID »
    new EmptyStringToUndefinedPipe(),
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Tarhib API')
    .setDescription(
      "Contrat API consommé par le Web Admin (TS) et l'app mobile Flutter (généré via openapi-generator-cli)",
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
