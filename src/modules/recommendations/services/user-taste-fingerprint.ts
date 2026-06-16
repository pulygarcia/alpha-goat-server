import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlfajorStatus } from '../../alfajores/domain/alfajor-status.enum';
import { Review } from '../../reviews/domain/review.entity';

// Los 5 ejes de una review. El vector de gusto vive sobre estos.
export const AXES = [
  'dulzor',
  'cantidadDDL',
  'calidadBano',
  'ratioTapaRelleno',
  'textura',
] as const;

export type Axis = (typeof AXES)[number];
export type AxisVector = Record<Axis, number>;

export const zeroVector = (): AxisVector => ({
  dulzor: 0,
  cantidadDDL: 0,
  calidadBano: 0,
  ratioTapaRelleno: 0,
  textura: 0,
});

/**
 * Construye la "huella de gusto" del usuario: el promedio de los 5 ejes de los
 * alfajores que reseñó, ponderado por el `ratingGeneral` que les puso (lo que
 * puntuó más alto pesa más). Usa las notas PROPIAS del usuario — es su gusto, no
 * el consenso de la comunidad.
 *
 * Devuelve `null` cuando el usuario no tiene reviews que aporten (cold start):
 * el finder cae al fallback de top rankeados.
 */
@Injectable()
export class UserTasteFingerprint {
  constructor(
    @InjectRepository(Review)
    private readonly reviews: Repository<Review>,
  ) {}

  async build(userId: string): Promise<AxisVector | null> {
    // Solo reviews del usuario sobre alfajores APPROVED (uno no debería poder
    // reseñar otros, pero el filtro deja la regla explícita y a prueba de datos
    // viejos de un alfajor que pasó a REJECTED).
    const rows = await this.reviews.find({
      where: { userId, alfajor: { status: AlfajorStatus.APPROVED } },
      relations: ['alfajor'],
    });
    if (rows.length === 0) return null;

    const acc = zeroVector();
    let weightSum = 0;
    for (const r of rows) {
      const weight = r.ratingGeneral;
      if (weight <= 0) continue; // un 0 no aporta señal de gusto
      weightSum += weight;
      for (const axis of AXES) acc[axis] += weight * r[axis];
    }
    if (weightSum === 0) return null;

    for (const axis of AXES) acc[axis] = acc[axis] / weightSum;
    return acc;
  }
}
