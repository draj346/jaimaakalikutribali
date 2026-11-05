import 'reflect-metadata';
import {NestFactory} from '@nestjs/core';
import {ValidationPipe} from '@nestjs/common';
import {AppModule} from './module';
async function bootstrap(){
 const app=await NestFactory.create(AppModule);
 app.enableCors({origin:(process.env.CORS_ORIGIN||'http://localhost:3000').split(','),methods:['GET','POST','PATCH','DELETE'],allowedHeaders:['Content-Type','Authorization']});
 app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));
 await app.listen(Number(process.env.PORT)||4100);
 console.log('Temple API listening');
}
bootstrap();
