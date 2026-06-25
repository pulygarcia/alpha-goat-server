import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ImageUploader } from '../../uploads/services/image-uploader';
import { User } from '../domain/user.entity';
import { AvatarUpdater } from './avatar-updater';
import { UserFinder } from './user-finder';

describe('AvatarUpdater', () => {
  let updater: AvatarUpdater;
  let repo: jest.Mocked<Repository<User>>;
  let finder: jest.Mocked<UserFinder>;
  let uploader: jest.Mocked<ImageUploader>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AvatarUpdater,
        {
          provide: getRepositoryToken(User),
          useValue: { save: jest.fn() },
        },
        { provide: UserFinder, useValue: { byId: jest.fn() } },
        { provide: ImageUploader, useValue: { upload: jest.fn() } },
      ],
    }).compile();

    updater = module.get(AvatarUpdater);
    repo = module.get(getRepositoryToken(User));
    finder = module.get(UserFinder);
    uploader = module.get(ImageUploader);
  });

  it('uploads with folder avatars + deterministic publicId and persists the url', async () => {
    const user = { id: 'u1', avatarUrl: null } as User;
    finder.byId.mockResolvedValue(user);
    uploader.upload.mockResolvedValue({
      url: 'https://cdn/avatars/u1.png',
      publicId: 'avatars/u1',
    });
    repo.save.mockImplementation(async (u) => u as User);

    const buffer = Buffer.from('img');
    const result = await updater.execute('u1', buffer);

    expect(uploader.upload).toHaveBeenCalledWith(buffer, {
      folder: 'avatars',
      publicId: 'u1',
    });
    expect(repo.save).toHaveBeenCalledWith(user);
    expect(result.avatarUrl).toBe('https://cdn/avatars/u1.png');
  });

  it('does not persist when the upload fails', async () => {
    finder.byId.mockResolvedValue({ id: 'u1', avatarUrl: null } as User);
    uploader.upload.mockRejectedValue(new Error('cloudinary down'));

    await expect(updater.execute('u1', Buffer.from('x'))).rejects.toThrow(
      'cloudinary down',
    );
    expect(repo.save).not.toHaveBeenCalled();
  });
});
