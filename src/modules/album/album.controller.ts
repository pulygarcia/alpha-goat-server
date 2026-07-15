import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AlbumResponseDto } from './dto/album-response.dto';
import { AlbumFinder } from './services/album-finder';

@ApiTags('album')
@Controller('users')
export class AlbumController {
  constructor(private readonly finder: AlbumFinder) {}

  // Público: el álbum se visita desde cualquier perfil; solo el dueño lo
  // "modifica", y lo hace indirectamente reseñando.
  @Get('by-username/:username/album')
  @ApiOperation({
    summary: 'Álbum de figuritas del usuario (hojas por marca)',
  })
  @ApiResponse({ status: 200, type: AlbumResponseDto })
  @ApiResponse({ status: 404, description: 'Username inexistente' })
  async byUsername(
    @Param('username') username: string,
  ): Promise<AlbumResponseDto> {
    return AlbumResponseDto.from(await this.finder.execute(username));
  }
}
