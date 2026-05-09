import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../domain/user.entity';
import { UserFinder } from './user-finder';
import { UserUpdater } from './user-updater';

describe('UserUpdater', () => {
  let updater: UserUpdater;
  let repo: jest.Mocked<Repository<User>>;
  let finder: jest.Mocked<UserFinder>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserUpdater,
        {
          provide: getRepositoryToken(User),
          useValue: { findOne: jest.fn(), save: jest.fn() },
        },
        { provide: UserFinder, useValue: { byId: jest.fn() } },
      ],
    }).compile();

    updater = module.get(UserUpdater);
    repo = module.get(getRepositoryToken(User));
    finder = module.get(UserFinder);
  });

  it('updates username when free', async () => {
    const user = { id: 'u1', username: 'old' } as User;
    finder.byId.mockResolvedValue(user);
    repo.findOne.mockResolvedValue(null);
    repo.save.mockImplementation(async (u) => u as User);

    const result = await updater.execute('u1', { username: 'new' });

    expect(result.username).toBe('new');
    expect(repo.save).toHaveBeenCalled();
  });

  it('throws ConflictException when username is taken', async () => {
    finder.byId.mockResolvedValue({ id: 'u1', username: 'old' } as User);
    repo.findOne.mockResolvedValue({ id: 'other' } as User);

    await expect(updater.execute('u1', { username: 'taken' })).rejects.toThrow(
      ConflictException,
    );
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('skips uniqueness check when username unchanged', async () => {
    const user = { id: 'u1', username: 'same' } as User;
    finder.byId.mockResolvedValue(user);
    repo.save.mockResolvedValue(user);

    await updater.execute('u1', { username: 'same' });

    expect(repo.findOne).not.toHaveBeenCalled();
  });

  it('saves untouched user when dto is empty', async () => {
    const user = { id: 'u1', username: 'same' } as User;
    finder.byId.mockResolvedValue(user);
    repo.save.mockResolvedValue(user);

    await updater.execute('u1', {});

    expect(repo.findOne).not.toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalledWith(user);
  });
});
