import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../domain/review.entity';

@Injectable()
export class ReviewFinder {
  constructor(
    @InjectRepository(Review)
    private readonly reviews: Repository<Review>,
  ) {}

  async byId(id: string): Promise<Review> {
    const r = await this.reviews.findOne({ where: { id } });
    if (!r) throw new NotFoundException(`review ${id} not found`);
    return r;
  }
}
