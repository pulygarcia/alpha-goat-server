import { Injectable, UnauthorizedException } from '@nestjs/common';
import { User } from '../../users/domain/user.entity';
import { UserFinder } from '../../users/services/user-finder';
import { LoginDto } from '../dto/login.dto';
import { PasswordHasher } from './password-hasher';

@Injectable()
export class UserAuthenticator {
  constructor(
    private readonly finder: UserFinder,
    private readonly hasher: PasswordHasher,
  ) {}

  async execute(dto: LoginDto): Promise<User> {
    const user = await this.finder.byEmail(dto.email);
    if (!user) throw new UnauthorizedException('invalid credentials');

    if (user.banned) throw new UnauthorizedException('account is banned');

    const ok = await this.hasher.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('invalid credentials');

    return user;
  }
}
