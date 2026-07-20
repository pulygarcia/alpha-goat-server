import { ApiProperty } from '@nestjs/swagger';
import { User } from '../domain/user.entity';

export class UserSearchResultDto {
  @ApiProperty() id: string;
  @ApiProperty() username: string;
  @ApiProperty({ nullable: true }) avatarUrl: string | null;
  @ApiProperty() isFollowing: boolean;

  static from(user: User, isFollowing: boolean): UserSearchResultDto {
    const dto = new UserSearchResultDto();
    dto.id = user.id;
    dto.username = user.username;
    dto.avatarUrl = user.avatarUrl;
    dto.isFollowing = isFollowing;
    return dto;
  }
}

export class PaginatedUserSearchDto {
  @ApiProperty({ type: [UserSearchResultDto] }) items: UserSearchResultDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
}
