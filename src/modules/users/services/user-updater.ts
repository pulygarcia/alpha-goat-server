import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { User } from '../domain/user.entity';
import { UserFinder } from './user-finder';

@Injectable()
export class UserUpdater {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly finder: UserFinder,
  ) {}

  async execute(userId: string, dto: UpdateProfileDto): Promise<User> {
    const user = await this.finder.byId(userId);

    if (dto.username && dto.username !== user.username) {
      const taken = await this.users.findOne({
        where: { username: dto.username, id: Not(userId) },
      });
      if (taken) throw new ConflictException('username already taken');
      user.username = dto.username;
    }

    return this.users.save(user);
  }
}
