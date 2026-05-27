import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/domain/user.entity';

// Relacion de seguimiento dirigida: `follower` sigue a `following`.
// No es simetrica (que A siga a B no implica lo inverso).
@Entity('user_follows')
@Unique('UQ_user_follow', ['followerId', 'followingId'])
export class UserFollow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  followerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'follower_id' })
  follower?: User;

  @Index()
  @Column({ type: 'uuid' })
  followingId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'following_id' })
  following?: User;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
