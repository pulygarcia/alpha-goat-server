import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../../users/domain/user-role.enum';
import { ImageUploader } from '../../uploads/services/image-uploader';
import { Alfajor } from '../domain/alfajor.entity';
import { AlfajorStatus } from '../domain/alfajor-status.enum';
import { AlfajorTipo } from '../domain/alfajor-tipo.enum';
import { AlfajorFinder } from './alfajor-finder';
import { AlfajorImageUpdater } from './alfajor-image-updater';

describe('AlfajorImageUpdater', () => {
  let updater: AlfajorImageUpdater;
  let repo: jest.Mocked<Repository<Alfajor>>;
  let finder: jest.Mocked<AlfajorFinder>;
  let uploader: jest.Mocked<ImageUploader>;

  const baseAlfajor = (overrides: Partial<Alfajor> = {}): Alfajor =>
    ({
      id: 'a1',
      nombre: 'Old',
      marcaId: 'm1',
      tipo: AlfajorTipo.CHOCOLATE,
      descripcion: null,
      imagenUrl: null,
      status: AlfajorStatus.PENDING,
      createdById: 'u1',
      ...overrides,
    }) as Alfajor;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AlfajorImageUpdater,
        {
          provide: getRepositoryToken(Alfajor),
          useValue: { save: jest.fn() },
        },
        { provide: AlfajorFinder, useValue: { byId: jest.fn() } },
        { provide: ImageUploader, useValue: { upload: jest.fn() } },
      ],
    }).compile();

    updater = module.get(AlfajorImageUpdater);
    repo = module.get(getRepositoryToken(Alfajor));
    finder = module.get(AlfajorFinder);
    uploader = module.get(ImageUploader);
  });

  it('owner uploads while PENDING: folder/publicId/overwrite + persists url', async () => {
    const alfajor = baseAlfajor();
    finder.byId.mockResolvedValue(alfajor);
    uploader.upload.mockResolvedValue({
      url: 'https://cdn/alfajores/a1.png',
      publicId: 'alfajores/a1',
    });
    repo.save.mockImplementation(async (a) => a as Alfajor);

    const buffer = Buffer.from('img');
    const result = await updater.execute('a1', buffer, {
      id: 'u1',
      role: UserRole.USER,
    });

    expect(uploader.upload).toHaveBeenCalledWith(buffer, {
      folder: 'alfajores',
      publicId: 'a1',
    });
    expect(repo.save).toHaveBeenCalledWith(alfajor);
    expect(result.imagenUrl).toBe('https://cdn/alfajores/a1.png');
  });

  it('admin uploads regardless of status/ownership', async () => {
    finder.byId.mockResolvedValue(
      baseAlfajor({ status: AlfajorStatus.APPROVED, createdById: 'other' }),
    );
    uploader.upload.mockResolvedValue({
      url: 'https://cdn/alfajores/a1.png',
      publicId: 'alfajores/a1',
    });
    repo.save.mockImplementation(async (a) => a as Alfajor);

    await expect(
      updater.execute('a1', Buffer.from('x'), {
        id: 'admin',
        role: UserRole.ADMIN,
      }),
    ).resolves.toBeDefined();
  });

  it('throws NotFoundException when the alfajor does not exist', async () => {
    finder.byId.mockRejectedValue(new NotFoundException());

    await expect(
      updater.execute('missing', Buffer.from('x'), {
        id: 'u1',
        role: UserRole.USER,
      }),
    ).rejects.toThrow(NotFoundException);
    expect(uploader.upload).not.toHaveBeenCalled();
  });

  it('rejects a non-owner non-admin without uploading', async () => {
    finder.byId.mockResolvedValue(baseAlfajor());

    await expect(
      updater.execute('a1', Buffer.from('x'), {
        id: 'other',
        role: UserRole.USER,
      }),
    ).rejects.toThrow(ForbiddenException);
    expect(uploader.upload).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('rejects the owner once APPROVED without uploading', async () => {
    finder.byId.mockResolvedValue(
      baseAlfajor({ status: AlfajorStatus.APPROVED }),
    );

    await expect(
      updater.execute('a1', Buffer.from('x'), {
        id: 'u1',
        role: UserRole.USER,
      }),
    ).rejects.toThrow(ForbiddenException);
    expect(uploader.upload).not.toHaveBeenCalled();
  });

  it('does not persist when the upload fails', async () => {
    finder.byId.mockResolvedValue(baseAlfajor());
    uploader.upload.mockRejectedValue(new Error('cloudinary down'));

    await expect(
      updater.execute('a1', Buffer.from('x'), {
        id: 'u1',
        role: UserRole.USER,
      }),
    ).rejects.toThrow('cloudinary down');
    expect(repo.save).not.toHaveBeenCalled();
  });
});
