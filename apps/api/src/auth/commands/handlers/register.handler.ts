import { ConflictException } from '@nestjs/common';
import {
  CommandBus,
  CommandHandler,
  ICommandHandler,
  QueryBus,
} from '@nestjs/cqrs';
import * as bcrypt from 'bcrypt';
import { User } from '@prisma/client';
import { CreateUserCommand } from '../../../users/commands/create-user.command';
import { FindUserByEmailQuery } from '../../../users/queries/find-user-by-email.query';
import { AuthTokenService } from '../../auth-token.service';
import { RegisterCommand } from '../register.command';

const PASSWORD_HASH_ROUNDS = 10;

@CommandHandler(RegisterCommand)
export class RegisterHandler implements ICommandHandler<
  RegisterCommand,
  { accessToken: string }
> {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly authTokenService: AuthTokenService,
  ) {}

  async execute(command: RegisterCommand): Promise<{ accessToken: string }> {
    const existingUser = await this.queryBus.execute<
      FindUserByEmailQuery,
      User | null
    >(new FindUserByEmailQuery(command.email));
    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(
      command.password,
      PASSWORD_HASH_ROUNDS,
    );
    const user = await this.commandBus.execute<CreateUserCommand, User>(
      new CreateUserCommand(command.email, passwordHash),
    );

    return { accessToken: this.authTokenService.sign(user.id, user.email) };
  }
}
