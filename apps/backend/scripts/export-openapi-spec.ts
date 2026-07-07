import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { writeFileSync, mkdirSync } from 'fs';
import { AppModule } from '../src/app.module';

async function exportSpec() {
  const app = await NestFactory.create(AppModule, { logger: false });

  const config = new DocumentBuilder()
    .setTitle('Tarhib API')
    .setDescription(
      'Contrat API — source de vérité pour la génération du client Dart mobile',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);

  mkdirSync('openapi', { recursive: true });
  writeFileSync('openapi/openapi.json', JSON.stringify(document, null, 2));

  await app.close();
  console.log('✅ apps/backend/openapi/openapi.json généré');
}

exportSpec();
