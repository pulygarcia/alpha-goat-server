import {
  BadRequestException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ImageFilePipe } from './image-file.pipe';

type MulterFile = Parameters<ImageFilePipe['transform']>[0];

const file = (overrides: Partial<MulterFile>): MulterFile => ({
  mimetype: 'image/png',
  size: 1024,
  buffer: Buffer.from('img'),
  ...overrides,
});

describe('ImageFilePipe', () => {
  let pipe: ImageFilePipe;

  beforeEach(() => {
    pipe = new ImageFilePipe();
  });

  it.each(['image/jpeg', 'image/png', 'image/webp'])(
    'returns the file when mime type is %s',
    (mimetype) => {
      const f = file({ mimetype });
      expect(pipe.transform(f)).toBe(f);
    },
  );

  it('throws UnsupportedMediaTypeException (415) for a disallowed type', () => {
    expect(() => pipe.transform(file({ mimetype: 'application/pdf' }))).toThrow(
      UnsupportedMediaTypeException,
    );
  });

  it('throws BadRequestException (400) when larger than 5 MB', () => {
    expect(() => pipe.transform(file({ size: 5 * 1024 * 1024 + 1 }))).toThrow(
      BadRequestException,
    );
  });

  it('accepts a file of exactly 5 MB', () => {
    const f = file({ size: 5 * 1024 * 1024 });
    expect(pipe.transform(f)).toBe(f);
  });

  it('throws BadRequestException (400) when the file is absent', () => {
    expect(() => pipe.transform(undefined)).toThrow(BadRequestException);
  });
});
