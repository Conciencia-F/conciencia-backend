import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ThrottlerExceptionFilter } from './shared/filters/throttler-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConsoleLogger, LogLevel, ValidationPipe } from '@nestjs/common';


function levelsFromEnv(): LogLevel[] {
  const all: LogLevel[] = ['fatal', 'error', 'warn', 'log', 'debug', 'verbose'];
  const target = (process.env.LOG_LEVEL as LogLevel) ?? 'log';
  const idx = Math.max(0, all.indexOf(target));
  return all.slice(0, idx + 1);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    logger: new ConsoleLogger({
      timestamp: true,
      logLevels: levelsFromEnv(),
    }),
  });

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

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
