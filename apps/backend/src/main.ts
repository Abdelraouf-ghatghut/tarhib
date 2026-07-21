import 'dotenv/config';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { EmptyStringToUndefinedPipe } from './common/pipes/empty-string-to-undefined.pipe';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  // CSP désactivée : cette API ne sert pas de HTML applicatif (Swagger UI
  // excepté, dont le script inline serait bloqué par une CSP par défaut) —
  // le CSP du contenu servi au navigateur est du ressort du Web Admin (§17).
  app.use(helmet({ contentSecurityPolicy: false }));
  app.useGlobalFilters(new AllExceptionsFilter());

  // credentials:true est requis pour le cookie de refresh HttpOnly — incompatible
  // avec origin:'*', d'où la liste blanche configurable
  const corsOrigins = (
    process.env.CORS_ORIGIN ?? 'http://localhost:5173,http://localhost:4173'
  )
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    // Liste blanche + tout localhost (Flutter web en debug utilise un port
    // aléatoire) — origin:'*' est impossible avec credentials:true
    origin: (
      origin: string | undefined,
      cb: (err: Error | null, allow?: boolean) => void,
    ) => {
      const allowed =
        !origin ||
        corsOrigins.includes(origin) ||
        /^https?:\/\/localhost:\d+$/.test(origin);
      cb(null, allowed);
    },
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
