import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CreateCommandeDto } from './dto/create-commande.dto';
import { UpdateStatutCommandeDto } from './dto/update-statut-commande.dto';
import { CommandesService } from './commandes.service';

@Controller('orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CommandesController {
  constructor(private readonly commandesService: CommandesService) {}

  @Post()
  @RequirePermissions('COMMANDE_CREER')
  @HttpCode(HttpStatus.CREATED)
  async creer(
    @CurrentUser() utilisateur: AuthenticatedUser,
    @Body() dto: CreateCommandeDto,
  ) {
    return this.commandesService.creer(utilisateur, dto);
  }

  @Get('mine')
  async mesCommandes(@CurrentUser() utilisateur: AuthenticatedUser) {
    return this.commandesService.listerMesCommandes(utilisateur);
  }

  @Get(':id')
  async obtenirParId(
    @CurrentUser() utilisateur: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.commandesService.obtenirParId(utilisateur, id);
  }

  @Patch(':id/status')
  @RequirePermissions('COMMANDE_GERER_STATUT')
  async changerStatut(
    @CurrentUser() utilisateur: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatutCommandeDto,
  ) {
    return this.commandesService.changerStatut(utilisateur, id, dto.statut);
  }
}
