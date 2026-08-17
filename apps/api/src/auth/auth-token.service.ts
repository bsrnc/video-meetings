import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class AuthTokenService {
  constructor(private readonly jwtService: JwtService) {}

  sign(userId: string, email: string): string {
    return this.jwtService.sign({ sub: userId, email });
  }

  verify(token: string): Promise<JwtPayload> {
    return this.jwtService.verifyAsync<JwtPayload>(token);
  }
}
