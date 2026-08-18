import { UnauthorizedException } from '@nestjs/common';
import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import * as bcrypt from 'bcrypt';
import { User } from '@prisma/client';
import { FindUserByEmailQuery } from '../../../users/queries/find-user-by-email.query';
import { AuthTokenService } from '../../auth-token.service';
import { LoginQuery } from '../login.query';

@QueryHandler(LoginQuery)
export class LoginHandler implements IQueryHandler<
  LoginQuery,
  { accessToken: string }
> {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly authTokenService: AuthTokenService,
  ) {}

  async execute(query: LoginQuery): Promise<{ accessToken: string }> {
    const user = await this.queryBus.execute<FindUserByEmailQuery, User | null>(
      new FindUserByEmailQuery(query.email),
    );
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
