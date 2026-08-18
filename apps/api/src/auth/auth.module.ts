import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthTokenService } from './auth-token.service';
import { RegisterHandler } from './commands/handlers/register.handler';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginHandler } from './queries/handlers/login.handler';

const CommandHandlers = [RegisterHandler];
const QueryHandlers = [LoginHandler];

@Module({
  imports: [
    CqrsModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthTokenService,
    JwtAuthGuard,
    ...CommandHandlers,
    ...QueryHandlers,
  ],
  exports: [AuthTokenService, JwtAuthGuard],
})
export class AuthModule {}
