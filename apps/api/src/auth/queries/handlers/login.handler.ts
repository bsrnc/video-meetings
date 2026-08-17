import { UnauthorizedException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../../../users/users.service';
import { AuthTokenService } from '../../auth-token.service';
import { LoginQuery } from '../login.query';

@QueryHandler(LoginQuery)
export class LoginHandler implements IQueryHandler<
  LoginQuery,
  { accessToken: string }
> {
  constructor(
    private readonly usersService: UsersService,
    private readonly authTokenService: AuthTokenService,
  ) {}

  async execute(query: LoginQuery): Promise<{ accessToken: string }> {
    const user = await this.usersService.findByEmail(query.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(
      query.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return { accessToken: this.authTokenService.sign(user.id, user.email) };
  }
}
