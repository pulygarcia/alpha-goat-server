import { PasswordHasher } from './password-hasher';

describe('PasswordHasher', () => {
  const hasher = new PasswordHasher();

  it('hashes a password and matches with compare', async () => {
    const hash = await hasher.hash('secret123');
    expect(hash).not.toBe('secret123');
    await expect(hasher.compare('secret123', hash)).resolves.toBe(true);
  });

  it('returns false when password does not match', async () => {
    const hash = await hasher.hash('secret123');
    await expect(hasher.compare('wrong', hash)).resolves.toBe(false);
  });
});
