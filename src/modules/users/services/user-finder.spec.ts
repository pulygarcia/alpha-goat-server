import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../domain/user.entity';
import { UserFinder } from './user-finder';

describe('UserFinder', () => {
  let finder: UserFinder;
  let repo: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserFinder,
        {
          provide: getRepositoryToken(User),
          useValue: { findOne: jest.fn() },
        },
      ],
    }).compile();

    finder = module.get(UserFinder);
    repo = module.get(getRepositoryToken(User));
  });

  it('byId returns user when found', async () => {
    const user = { id: 'u1' } as User;
    repo.findOne.mockResolvedValue(user);
    await expect(finder.byId('u1')).resolves.toBe(user);
  });

  it('byId throws NotFoundException when missing', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(finder.byId('missing')).rejects.toThrow(NotFoundException);
  });

  it('byEmail lowercases input', async () => {
    repo.findOne.mockResolvedValue(null);
    await finder.byEmail('Foo@Bar.com');
    expect(repo.findOne).toHaveBeenCalledWith({
      where: { email: 'foo@bar.com' },
    });
  });

  it('byUsername queries repo', async () => {
    const user = { username: 'puly' } as User;
    repo.findOne.mockResolvedValue(user);
    await expect(finder.byUsername('puly')).resolves.toBe(user);
  });
});
