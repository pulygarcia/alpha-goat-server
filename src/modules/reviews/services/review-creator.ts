import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlfajorStatus } from '../../alfajores/domain/alfajor-status.enum';
import { AlfajorFinder } from '../../alfajores/services/alfajor-finder';
import { Review } from '../domain/review.entity';
import { CreateReviewDto } from '../dto/create-review.dto';

@Injectable()
export class ReviewCreator {
  constructor(
    @InjectRepository(Review)
    private readonly reviews: Repository<Review>,
    private readonly alfajorFinder: AlfajorFinder,
  ) {}

  async execute(dto: CreateReviewDto, userId: string): Promise<Review> {
    const alfajor = await this.alfajorFinder.byId(dto.alfajorId);
    if (alfajor.status !== AlfajorStatus.APPROVED) {
      throw new BadRequestException('only approved alfajores can be reviewed');
    }

    const exists = await this.reviews.findOne({
      where: { userId, alfajorId: dto.alfajorId },
    });
    if (exists) {
      throw new ConflictException('you already reviewed this alfajor');
    }

    const review = this.reviews.create({ ...dto, userId });
    return this.reviews.save(review);
  }
}
