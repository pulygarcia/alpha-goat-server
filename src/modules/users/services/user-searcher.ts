import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Raw, Repository } from 'typeorm';
import { FollowToggler } from '../../follows/services/follow-toggler';
import { User } from '../domain/user.entity';
import { SearchUsersDto } from '../dto/search-users.dto';
import { UserSearchResultDto } from '../dto/user-search-result.dto';

export interface PaginatedUserSearchResults {
  items: UserSearchResultDto[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class UserSearcher {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly follows: FollowToggler,
  ) {}

  async execute(
    dto: SearchUsersDto,
    viewerId: string,
  ): Promise<PaginatedUserSearchResults> {
    const { q, page, limit } = dto;

    const [items, total] = await this.users.findAndCount({
      where: {
        banned: false,
        id: Not(viewerId),
        ...(q
          ? {
              username: Raw(
                (alias) => `unaccent(${alias}) ILIKE unaccent(:q)`,
                { q: `%${q}%` },
              ),
            }
          : {}),
      },
      order: { username: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const followingIds =
      items.length > 0
        ? await this.follows.followingAmong(
            viewerId,
            items.map((u) => u.id),
          )
        : new Set<string>();

    return {
      items: items.map((u) =>
        UserSearchResultDto.from(u, followingIds.has(u.id)),
      ),
      total,
      page,
      limit,
    };
  }
}
