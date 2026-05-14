import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alfajor } from '../../alfajores/domain/alfajor.entity';
import { AlfajorStatus } from '../../alfajores/domain/alfajor-status.enum';
import { AlfajorFinder } from '../../alfajores/services/alfajor-finder';
import { RejectAlfajorDto } from '../dto/reject-alfajor.dto';

@Injectable()
export class AlfajorRejecter {
  constructor(
    @InjectRepository(Alfajor)
    private readonly alfajores: Repository<Alfajor>,
    private readonly finder: AlfajorFinder,
  ) {}

  async execute(id: string, dto: RejectAlfajorDto): Promise<Alfajor> {
    const alfajor = await this.finder.byId(id);

    if (alfajor.status !== AlfajorStatus.PENDING) {
      throw new BadRequestException(
        `only PENDING alfajores can be rejected (current: ${alfajor.status})`,
      );
    }

    alfajor.status = AlfajorStatus.REJECTED;
    alfajor.rejectionReason = dto.rejectionReason;
    return this.alfajores.save(alfajor);
  }
}
