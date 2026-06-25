import { Test } from '@nestjs/testing';
import { CLOUDINARY } from '../../../config/cloudinary.config';
import { ImageRemover } from './image-remover';

describe('ImageRemover', () => {
  let remover: ImageRemover;
  let destroy: jest.Mock;

  beforeEach(async () => {
    destroy = jest.fn().mockResolvedValue({ result: 'ok' });
    const cloudinary = { uploader: { destroy } };

    const module = await Test.createTestingModule({
      providers: [
        ImageRemover,
        {
          provide: CLOUDINARY,
          useValue: cloudinary,
        },
      ],
    }).compile();

    remover = module.get(ImageRemover);
  });

  it('destroys the asset by publicId', async () => {
    await remover.remove('avatars/u1');

    expect(destroy).toHaveBeenCalledWith('avatars/u1', {
      resource_type: 'image',
    });
  });

  it('propagates provider errors', async () => {
    destroy.mockRejectedValue(new Error('cloudinary down'));

    await expect(remover.remove('avatars/u1')).rejects.toThrow(
      'cloudinary down',
    );
  });
});
