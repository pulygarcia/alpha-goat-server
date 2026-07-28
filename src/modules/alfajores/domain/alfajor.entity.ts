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
import { Marca } from '../../marcas/domain/marca.entity';
import { User } from '../../users/domain/user.entity';
import { AlfajorStatus } from './alfajor-status.enum';
import { AlfajorTipo } from './alfajor-tipo.enum';

@Entity('alfajores')
@Unique('UQ_alfajor_nombre_marca', ['nombre', 'marcaId'])
export class Alfajor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  // Nullable solo para propuestas PENDING con marca libre: un alfajor
  // APPROVED siempre tiene marca (la resuelve el admin al aprobar).
  @Index()
  @Column({ type: 'uuid', nullable: true })
  marcaId: string | null;

  @ManyToOne(() => Marca, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'marca_id' })
  marca?: Marca | null;

  // Marca pedida en texto libre por el usuario cuando no estaba en el
  // catálogo. Dato transitorio de la propuesta: se limpia al aprobar.
  @Column({ type: 'varchar', length: 120, nullable: true })
  marcaNombrePropuesto: string | null;

  @Column({ type: 'enum', enum: AlfajorTipo })
  tipo: AlfajorTipo;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  imagenUrl: string | null;

  @Index()
  @Column({ type: 'enum', enum: AlfajorStatus, default: AlfajorStatus.PENDING })
  status: AlfajorStatus;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ type: 'uuid', nullable: true })
  createdById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy?: User | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
