import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import dataSource from '../data-source';
import { User } from '../../modules/users/domain/user.entity';
import { UserRole } from '../../modules/users/domain/user-role.enum';

const BCRYPT_ROUNDS = 10;

async function run(): Promise<void> {
  const email = process.env.ADMIN_EMAIL;
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !username || !password) {
    throw new Error(
      'Missing env vars: set ADMIN_EMAIL, ADMIN_USERNAME and ADMIN_PASSWORD before running this seed.',
    );
  }

  await dataSource.initialize();

  try {
    const repo = dataSource.getRepository(User);
    const existing = await repo.findOne({ where: { email } });

    if (existing) {
      if (existing.role === UserRole.ADMIN) {
        console.log(`User ${email} is already ADMIN. Nothing to do.`);
        return;
      }
      existing.role = UserRole.ADMIN;
      await repo.save(existing);
      console.log(`User ${email} promoted to ADMIN.`);
      return;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const admin = repo.create({
      email,
      username,
      passwordHash,
      role: UserRole.ADMIN,
    });
    await repo.save(admin);
    console.log(`Admin user ${email} created.`);
  } finally {
    await dataSource.destroy();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
