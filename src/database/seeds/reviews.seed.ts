import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import dataSource from '../data-source';
import { Alfajor } from '../../modules/alfajores/domain/alfajor.entity';
import { AlfajorStatus } from '../../modules/alfajores/domain/alfajor-status.enum';
import { Review } from '../../modules/reviews/domain/review.entity';
import { User } from '../../modules/users/domain/user.entity';

const BCRYPT_ROUNDS = 10;
const DEFAULT_PASSWORD = 'Demo1234!';
const DAY_MS = 24 * 60 * 60 * 1000;

// Demo reviewers. Si no existen, los crea con password "Demo1234!".
const REVIEWERS = [
  { email: 'demo.maru@alfajorimetro.test', username: 'maru' },
  { email: 'demo.tincho@alfajorimetro.test', username: 'tincho' },
  { email: 'demo.flor@alfajorimetro.test', username: 'flor' },
  { email: 'demo.juancho@alfajorimetro.test', username: 'juancho' },
  { email: 'demo.lula@alfajorimetro.test', username: 'lula' },
];

const COMENTARIOS = [
  'Clasiquísimo. No falla nunca.',
  'Demasiado dulce para mi gusto, pero la textura cumple.',
  'El baño se quiebra fácil, restando puntos.',
  'Ratio tapa/relleno impecable, da gusto comerlo.',
  'Esperaba más DDL. La marca me tiene mal acostumbrado.',
  'Sorpresa positiva: textura aireada y dulzor justo.',
  null,
];

// PRNG determinista (mulberry32) — corremos el seed N veces y siempre
// generamos los mismos números si arrancamos del mismo "salt".
function rng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pickRating(r: () => number, base: number): number {
  // jitter de ±1.5 alrededor del rating "base" del alfajor, clampeado a [3, 10]
  const v = base + (r() - 0.5) * 3;
  return Math.round(Math.max(3, Math.min(10, v)) * 10) / 10;
}

async function ensureReviewers(): Promise<User[]> {
  const repo = dataSource.getRepository(User);
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, BCRYPT_ROUNDS);
  const users: User[] = [];

  for (const r of REVIEWERS) {
    const existing = await repo.findOne({ where: { email: r.email } });
    if (existing) {
      users.push(existing);
      continue;
    }
    const created = await repo.save(
      repo.create({ email: r.email, username: r.username, passwordHash }),
    );
    users.push(created);
  }
  return users;
}

async function run(): Promise<void> {
  await dataSource.initialize();

  try {
    const reviewers = await ensureReviewers();
    const alfajorRepo = dataSource.getRepository(Alfajor);
    const reviewRepo = dataSource.getRepository(Review);

    const alfajores = await alfajorRepo.find({ where: { status: AlfajorStatus.APPROVED } });
    if (alfajores.length === 0) {
      console.warn('No hay alfajores APPROVED — corré seed:alfajores antes.');
      return;
    }

    const now = Date.now();
    let created = 0;
    let skipped = 0;

    for (let i = 0; i < alfajores.length; i++) {
      const alfajor = alfajores[i];
      const r = rng(i + 1);
      // Cada alfajor tiene un rating "base" entre 5.5 y 9 — su personalidad.
      const baseRating = 5.5 + r() * 3.5;
      // Cantidad de reseñas: 1 a 5. Inflamos algunos para que haya un ganador claro.
      const total = 1 + Math.floor(r() * 5);

      for (let j = 0; j < total && j < reviewers.length; j++) {
        const user = reviewers[j];
        const exists = await reviewRepo.findOne({
          where: { userId: user.id, alfajorId: alfajor.id },
        });
        if (exists) {
          skipped++;
          continue;
        }

        // Distribuimos createdAt en los últimos 14 días: la mitad cae en
        // [-7d, now) (esta semana) y la otra mitad en [-14d, -7d) (semana
        // anterior). Así el endpoint /feed/hero ve un delta no trivial.
        const inThisWeek = r() > 0.4;
        const offsetDays = inThisWeek ? r() * 7 : 7 + r() * 7;
        const createdAt = new Date(now - offsetDays * DAY_MS);

        await reviewRepo.save(
          reviewRepo.create({
            userId: user.id,
            alfajorId: alfajor.id,
            ratingGeneral: pickRating(r, baseRating),
            dulzor: pickRating(r, baseRating),
            cantidadDDL: pickRating(r, baseRating),
            calidadBano: pickRating(r, baseRating),
            ratioTapaRelleno: pickRating(r, baseRating),
            textura: pickRating(r, baseRating),
            comentario: COMENTARIOS[Math.floor(r() * COMENTARIOS.length)] ?? null,
            createdAt,
          }),
        );
        created++;
      }
    }

    console.log(`Reviews seed done. created=${created} skipped=${skipped}`);
    console.log(`Demo users password: ${DEFAULT_PASSWORD}`);
  } finally {
    await dataSource.destroy();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
