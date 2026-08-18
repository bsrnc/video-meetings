import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateUserHandler } from './commands/handlers/create-user.handler';
import { UsersService } from './users.service';

const CommandHandlers = [CreateUserHandler];

@Module({
  imports: [CqrsModule],
  providers: [UsersService, ...CommandHandlers],
  exports: [UsersService],
})
export class UsersModule {}
