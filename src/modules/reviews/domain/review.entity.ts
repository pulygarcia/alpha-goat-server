import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Alfajor } from '../../alfajores/domain/alfajor.entity';
import { User } from '../../users/domain/user.entity';

// TypeORM devuelve numeric como string; transformamos a number en lectura.
const numericTransformer = {
  to: (value?: number) => value,
  from: (value?: string | null) => (value === null || value === undefined ? value : Number(value)),
};

const ratingColumn = () => ({
  type: 'numeric' as const,
  precision: 3,
  scale: 1,
  transformer: numericTransformer,
});

@Entity('reviews')
@Unique('UQ_review_user_alfajor', ['userId', 'alfajorId'])
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Index()
  @Column({ type: 'uuid' })
  alfajorId: string;

  @ManyToOne(() => Alfajor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'alfajor_id' })
  alfajor?: Alfajor;

  @Column(ratingColumn())
  ratingGeneral: number;

  @Column(ratingColumn())
  dulzor: number;

  @Column(ratingColumn())
  cantidadDDL: number;

  @Column(ratingColumn())
  calidadBano: number;

  @Column(ratingColumn())
  ratioTapaRelleno: number;

  @Column(ratingColumn())
  textura: number;

  @Column({ type: 'text', nullable: true })
  comentario: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  fotoUrl: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
