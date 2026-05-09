import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PasswordHasher } from '../../auth/services/password-hasher';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { User } from '../domain/user.entity';
import { UserFinder } from './user-finder';

@Injectable()
export class UserPasswordChanger {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly finder: UserFinder,
    private readonly hasher: PasswordHasher,
  ) {}

  async execute(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.finder.byId(userId);

    const ok = await this.hasher.compare(dto.currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedException('current password is incorrect');

    user.passwordHash = await this.hasher.hash(dto.newPassword);
    await this.users.save(user);
  }
}
