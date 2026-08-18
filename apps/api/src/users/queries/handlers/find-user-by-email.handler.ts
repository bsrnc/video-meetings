import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { User } from '@prisma/client';
import { UsersService } from '../../users.service';
import { FindUserByEmailQuery } from '../find-user-by-email.query';

@QueryHandler(FindUserByEmailQuery)
export class FindUserByEmailHandler implements IQueryHandler<
  FindUserByEmailQuery,
  User | null
> {
  constructor(private readonly usersService: UsersService) {}

  execute(query: FindUserByEmailQuery): Promise<User | null> {
    return this.usersService.findByEmail(query.email);
  }
}
