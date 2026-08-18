import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateUserHandler } from './commands/handlers/create-user.handler';
import { FindUserByEmailHandler } from './queries/handlers/find-user-by-email.handler';
import { UsersService } from './users.service';

const CommandHandlers = [CreateUserHandler];
const QueryHandlers = [FindUserByEmailHandler];

@Module({
  imports: [CqrsModule],
  providers: [UsersService, ...CommandHandlers, ...QueryHandlers],
})
export class UsersModule {}
