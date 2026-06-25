import { Test } from '@nestjs/testing';
import { CLOUDINARY } from '../../../config/cloudinary.config';
import { ImageUploader } from './image-uploader';

describe('ImageUploader', () => {
  let uploader: ImageUploader;
  let uploadStream: jest.Mock;
  let cloudinary: { uploader: { upload_stream: jest.Mock } };

  beforeEach(async () => {
    uploadStream = jest.fn();
    cloudinary = { uploader: { upload_stream: uploadStream } };

    const module = await Test.createTestingModule({
      providers: [
        ImageUploader,
        {
          provide: CLOUDINARY,
          useValue: cloudinary,
        },
      ],
    }).compile();

    uploader = module.get(ImageUploader);
  });

  it('uploads the buffer with the given folder/publicId and overwrite, returning secure_url', async () => {
    const buffer = Buffer.from('img');
    const end = jest.fn();
    uploadStream.mockImplementation((_opts, cb) => {
      cb(null, {
        secure_url: 'https://cdn/avatars/u1.png',
        public_id: 'avatars/u1',
      });
      return { end };
    });

    const result = await uploader.upload(buffer, {
      folder: 'avatars',
      publicId: 'u1',
    });

    expect(uploadStream).toHaveBeenCalledWith(
      {
        folder: 'avatars',
        public_id: 'u1',
        overwrite: true,
        resource_type: 'image',
      },
      expect.any(Function),
    );
    expect(end).toHaveBeenCalledWith(buffer);
    expect(result).toEqual({
      url: 'https://cdn/avatars/u1.png',
      publicId: 'avatars/u1',
    });
  });

  it('rejects when the provider returns an error', async () => {
    uploadStream.mockImplementation((_opts, cb) => {
      cb(new Error('cloudinary down'), undefined);
      return { end: jest.fn() };
    });

    await expect(
      uploader.upload(Buffer.from('x'), { folder: 'avatars', publicId: 'u1' }),
    ).rejects.toThrow('cloudinary down');
  });

  it('rejects when the provider returns no result', async () => {
    uploadStream.mockImplementation((_opts, cb) => {
      cb(undefined, undefined);
      return { end: jest.fn() };
    });

    await expect(
      uploader.upload(Buffer.from('x'), { folder: 'avatars', publicId: 'u1' }),
    ).rejects.toThrow('Cloudinary upload failed');
  });
});
