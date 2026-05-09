import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../../users/domain/user-role.enum';
import { User } from '../../users/domain/user.entity';
import { RegisterDto } from '../dto/register.dto';
import { PasswordHasher } from './password-hasher';

@Injectable()
export class UserRegistrar {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly hasher: PasswordHasher,
  ) {}

  async execute(dto: RegisterDto): Promise<User> {
    const email = dto.email.toLowerCase();

    const clash = await this.users.findOne({
      where: [{ email }, { username: dto.username }],
    });
    if (clash) {
      const field = clash.email === email ? 'email' : 'username';
      throw new ConflictException(`${field} already in use`);
    }

    const passwordHash = await this.hasher.hash(dto.password);
    const user = this.users.create({
      email,
      username: dto.username,
      passwordHash,
      role: UserRole.USER,
    });

    return this.users.save(user);
  }
}
