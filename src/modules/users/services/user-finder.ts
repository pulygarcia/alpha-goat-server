import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../domain/user.entity';

@Injectable()
export class UserFinder {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async byId(id: string): Promise<User> {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async byEmail(email: string): Promise<User | null> {
    return this.users.findOne({ where: { email: email.toLowerCase() } });
  }

  async byUsername(username: string): Promise<User | null> {
    return this.users.findOne({ where: { username } });
  }

  async byUsernameOrFail(username: string): Promise<User> {
    const user = await this.byUsername(username);
    if (!user) throw new NotFoundException(`User @${username} not found`);
    return user;
  }
}
