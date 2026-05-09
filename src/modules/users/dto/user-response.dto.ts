import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../domain/user-role.enum';
import { User } from '../domain/user.entity';

export class UserResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() email: string;
  @ApiProperty() username: string;
  @ApiProperty({ nullable: true }) avatarUrl: string | null;
  @ApiProperty({ enum: UserRole }) role: UserRole;
  @ApiProperty() createdAt: Date;

  static from(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.username = user.username;
    dto.avatarUrl = user.avatarUrl;
    dto.role = user.role;
    dto.createdAt = user.createdAt;
    return dto;
  }
}
