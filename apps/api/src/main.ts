import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true, rawBody: true });
  const logger = app.get(Logger);
  app.useLogger(logger);
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const corsOrigins = String(process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  app.enableCors({
    origin:
      corsOrigins.length > 0
        ? corsOrigins
        : [
            'http://localhost:5173',
            'http://localhost:5174',
            'http://localhost:4321',
            'http://127.0.0.1:5173',
            'http://127.0.0.1:5174',
          ],
    credentials: true,
  });

  app.setGlobalPrefix('v1');

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Association Platform API')
    .setDescription(
      'Multi-tenant Association Management Platform — Identity, Platform, RBAC, Files, Members, Institutions, Billing, CMS, Events, Committees',
    )
    .setVersion('0.6.1')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'x-organization-slug', in: 'header' }, 'tenant')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  logger.log(`API listening on port ${port}`);
  logger.log(`Swagger UI at http://localhost:${port}/docs`);
}

void bootstrap();
