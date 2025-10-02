import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ThrottlerExceptionFilter } from './shared/filters/throttler-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './shared/filters/allExceptionFilter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: [`http://127.0.0.1:${process.env.CLIENT_PORT}`],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe());

  const config = new DocumentBuilder()
    .setTitle('Conciencia API')
    .setDescription('Documentación de la API para el proyecto Conciencia')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  app.useGlobalFilters(new ThrottlerExceptionFilter());
  app.useLogger(['error', 'warn', 'log']);
  app.useGlobalFilters(new AllExceptionsFilter());


  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
