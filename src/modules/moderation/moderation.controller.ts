import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AlfajorStatus } from '../alfajores/domain/alfajor-status.enum';
import {
  AlfajorResponseDto,
  PaginatedAlfajoresDto,
} from '../alfajores/dto/alfajor-response.dto';
import { SearchAlfajoresDto } from '../alfajores/dto/search-alfajores.dto';
import { AlfajorSearcher } from '../alfajores/services/alfajor-searcher';
import { UserRole } from '../users/domain/user-role.enum';
import { ApproveAlfajorDto } from './dto/approve-alfajor.dto';
import { RejectAlfajorDto } from './dto/reject-alfajor.dto';
import { AlfajorApprover } from './services/alfajor-approver';
import { AlfajorRejecter } from './services/alfajor-rejecter';

@ApiTags('admin/alfajores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/alfajores')
export class ModerationController {
  constructor(
    private readonly searcher: AlfajorSearcher,
    private readonly approver: AlfajorApprover,
    private readonly rejecter: AlfajorRejecter,
  ) {}

  @ApiOperation({
    summary: 'Listar alfajores PENDING',
    description:
      'Listado paginado de alfajores en estado PENDING esperando moderación.',
  })
  @ApiResponse({ status: 200, type: PaginatedAlfajoresDto })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  @ApiResponse({ status: 403, description: 'El usuario no es ADMIN.' })
  @Get('pending')
  async listPending(
    @Query() dto: SearchAlfajoresDto,
  ): Promise<PaginatedAlfajoresDto> {
    const { items, total, page, limit } = await this.searcher.execute(
      { ...dto, status: AlfajorStatus.PENDING },
      { includeAllStatuses: true },
    );
    return {
      items: items.map((a) => AlfajorResponseDto.from(a)),
      total,
      page,
      limit,
    };
  }

  @ApiOperation({
    summary: 'Aprobar un alfajor',
    description:
      'Cambia el status del alfajor de PENDING a APPROVED y limpia el rejectionReason. ' +
      'Si la propuesta vino con marca en texto libre, acá se resuelve la marca: ' +
      'con `marcaId` se mapea a una existente, y sin body se crea (o se reusa) la del nombre propuesto.',
  })
  @ApiBody({ type: ApproveAlfajorDto, required: false })
  @ApiResponse({ status: 200, type: AlfajorResponseDto })
  @ApiResponse({
    status: 400,
    description: 'El alfajor no está en PENDING o no hay marca que resolver.',
  })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  @ApiResponse({ status: 403, description: 'El usuario no es ADMIN.' })
  @ApiResponse({ status: 404, description: 'Alfajor o marca inexistente.' })
  @ApiResponse({
    status: 409,
    description: 'Ya existe ese alfajor para la marca resuelta.',
  })
  @Patch(':id/approve')
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveAlfajorDto,
  ): Promise<AlfajorResponseDto> {
    return AlfajorResponseDto.from(await this.approver.execute(id, dto));
  }

  @ApiOperation({
    summary: 'Rechazar un alfajor',
    description:
      'Cambia el status del alfajor de PENDING a REJECTED y guarda el rejectionReason recibido.',
  })
  @ApiResponse({ status: 200, type: AlfajorResponseDto })
  @ApiResponse({
    status: 400,
    description: 'El alfajor no está en PENDING o falta rejectionReason.',
  })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  @ApiResponse({ status: 403, description: 'El usuario no es ADMIN.' })
  @ApiResponse({ status: 404, description: 'Alfajor inexistente.' })
  @Patch(':id/reject')
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectAlfajorDto,
  ): Promise<AlfajorResponseDto> {
    return AlfajorResponseDto.from(await this.rejecter.execute(id, dto));
  }
}
