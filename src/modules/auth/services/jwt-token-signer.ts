import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '../../users/domain/user.entity';

export interface JwtPayload {
  sub: string;
  role: string;
}

@Injectable()
export class JwtTokenSigner {
  constructor(private readonly jwt: JwtService) {}

  async sign(user: User): Promise<string> {
    const payload: JwtPayload = { sub: user.id, role: user.role };
    return this.jwt.signAsync(payload);
  }
}
