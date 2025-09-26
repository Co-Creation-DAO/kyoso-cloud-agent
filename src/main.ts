import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { IdentusExceptionFilter } from './common/exception-filters/identus-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Apply global exception filter
  app.useGlobalFilters(new IdentusExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('Identus API Proxy')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer' }, 'bearer')
    .addApiKey({ type: 'apiKey', in: 'header', name: 'x-api-key' }, 'api_key')
    .addSecurityRequirements('bearer')
    .addSecurityRequirements('api_key')
    .build();
  const doc = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, doc);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(`Server running on http://localhost:${port}`, 'Bootstrap');
}
bootstrap();
