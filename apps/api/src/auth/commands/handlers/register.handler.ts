import { ConflictException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../../../users/users.service';
import { AuthTokenService } from '../../auth-token.service';
import { RegisterCommand } from '../register.command';

const PASSWORD_HASH_ROUNDS = 10;

@CommandHandler(RegisterCommand)
export class RegisterHandler implements ICommandHandler<
  RegisterCommand,
  { accessToken: string }
> {
  constructor(
    private readonly usersService: UsersService,
    private readonly authTokenService: AuthTokenService,
  ) {}

  async execute(command: RegisterCommand): Promise<{ accessToken: string }> {
    const existingUser = await this.usersService.findByEmail(command.email);
    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(
      command.password,
      PASSWORD_HASH_ROUNDS,
    );
    const user = await this.usersService.create(command.email, passwordHash);

    return { accessToken: this.authTokenService.sign(user.id, user.email) };
  }
}
