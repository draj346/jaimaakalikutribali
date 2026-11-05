import {Module} from '@nestjs/common';
import {JwtModule} from '@nestjs/jwt';
import {TempleController} from './temple.controller';
import {TempleService} from './temple.service';
import {PrismaService} from './prisma.service';
@Module({imports:[JwtModule.register({secret:process.env.JWT_SECRET||'UNSAFE_CHANGE_ME',signOptions:{expiresIn:'6h'}})],controllers:[TempleController],providers:[TempleService,PrismaService]})
export class AppModule {}
