import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PasswordHasher } from '../../auth/services/password-hasher';
import { User } from '../domain/user.entity';
import { UserFinder } from './user-finder';
import { UserPasswordChanger } from './user-password-changer';

describe('UserPasswordChanger', () => {
  let changer: UserPasswordChanger;
  let repo: jest.Mocked<Repository<User>>;
  let finder: jest.Mocked<UserFinder>;
  let hasher: jest.Mocked<PasswordHasher>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserPasswordChanger,
        {
          provide: getRepositoryToken(User),
          useValue: { save: jest.fn() },
        },
        { provide: UserFinder, useValue: { byId: jest.fn() } },
        {
          provide: PasswordHasher,
          useValue: { compare: jest.fn(), hash: jest.fn() },
        },
      ],
    }).compile();

    changer = module.get(UserPasswordChanger);
    repo = module.get(getRepositoryToken(User));
    finder = module.get(UserFinder);
    hasher = module.get(PasswordHasher);
  });

  it('hashes new password and saves when current is valid', async () => {
    const user = { id: 'u1', passwordHash: 'oldhash' } as User;
    finder.byId.mockResolvedValue(user);
    hasher.compare.mockResolvedValue(true);
    hasher.hash.mockResolvedValue('newhash');

    await changer.execute('u1', {
      currentPassword: 'old',
      newPassword: 'newpass1',
    });

    expect(user.passwordHash).toBe('newhash');
    expect(repo.save).toHaveBeenCalledWith(user);
  });

  it('throws UnauthorizedException when current password is wrong', async () => {
    finder.byId.mockResolvedValue({ passwordHash: 'oldhash' } as User);
    hasher.compare.mockResolvedValue(false);

    await expect(
      changer.execute('u1', {
        currentPassword: 'bad',
        newPassword: 'newpass1',
      }),
    ).rejects.toThrow(UnauthorizedException);

    expect(hasher.hash).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });
});
