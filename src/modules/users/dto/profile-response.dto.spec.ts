import { UserRole } from '../domain/user-role.enum';
import { User } from '../domain/user.entity';
import { ProfileExtra, ProfileResponseDto } from './profile-response.dto';

const user = {
  id: 'u1',
  username: 'puly',
  email: 'puly@example.com',
  avatarUrl: null,
  role: UserRole.USER,
  createdAt: new Date('2026-01-01'),
} as User;

const baseExtra: ProfileExtra = {
  followersCount: 3,
  followingCount: 2,
  reviewsCount: 5,
  isFollowing: false,
  includeEmail: false,
};

describe('ProfileResponseDto', () => {
  it('maps public fields and social aggregates', () => {
    const dto = ProfileResponseDto.from(user, baseExtra);

    expect(dto).toMatchObject({
      id: 'u1',
      username: 'puly',
      avatarUrl: null,
      role: UserRole.USER,
      followersCount: 3,
      followingCount: 2,
      reviewsCount: 5,
    });
  });

  it('omits email when not the owner', () => {
    const dto = ProfileResponseDto.from(user, baseExtra);
    expect(dto.email).toBeUndefined();
  });

  it('includes email only when includeEmail is true', () => {
    const dto = ProfileResponseDto.from(user, {
      ...baseExtra,
      includeEmail: true,
    });
    expect(dto.email).toBe('puly@example.com');
  });

  it('carries isFollowing true/false/null through', () => {
    expect(
      ProfileResponseDto.from(user, { ...baseExtra, isFollowing: true })
        .isFollowing,
    ).toBe(true);
    expect(
      ProfileResponseDto.from(user, { ...baseExtra, isFollowing: false })
        .isFollowing,
    ).toBe(false);
    expect(
      ProfileResponseDto.from(user, { ...baseExtra, isFollowing: null })
        .isFollowing,
    ).toBeNull();
  });
});
