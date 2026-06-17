import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Review } from '../domain/review.entity';
import { SearchReviewsDto } from '../dto/search-reviews.dto';

export interface PaginatedReviews {
  items: Review[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class ReviewSearcher {
  constructor(
    @InjectRepository(Review)
    private readonly reviews: Repository<Review>,
  ) {}

  async execute(dto: SearchReviewsDto): Promise<PaginatedReviews> {
    const { alfajorId, userId, page, limit } = dto;
    const where: FindOptionsWhere<Review> = {};
    if (alfajorId) where.alfajorId = alfajorId;
    if (userId) where.userId = userId;

    const [items, total] = await this.reviews.findAndCount({
      where,
      relations: { user: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }
}
