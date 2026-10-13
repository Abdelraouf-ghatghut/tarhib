import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CreateUtilisateurDto } from './dto/create-utilisateur.dto';
import { ListUtilisateursQueryDto } from './dto/list-utilisateurs-query.dto';
import { UpdateUtilisateurDto } from './dto/update-utilisateur.dto';
import { UtilisateursService } from './utilisateurs.service';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UtilisateursController {
  constructor(private readonly utilisateursService: UtilisateursService) {}

  @Get('me')
  async moi(@CurrentUser() utilisateur: AuthenticatedUser) {
    return this.utilisateursService.getProfilComplet(utilisateur.sub);
  }

  @Post()
  @RequirePermissions('UTILISATEUR_CREER')
  async creer(
    @CurrentUser() acteur: AuthenticatedUser,
    @Body() dto: CreateUtilisateurDto,
  ) {
    return this.utilisateursService.creer(acteur, dto);
  }

  @Get()
  @RequirePermissions('UTILISATEUR_LISTER')
  async lister(
    @CurrentUser() acteur: AuthenticatedUser,
    @Query() query: ListUtilisateursQueryDto,
  ) {
    return this.utilisateursService.lister(acteur, query);
  }

  @Get(':id')
  @RequirePermissions('UTILISATEUR_LISTER')
  async obtenirParId(
    @CurrentUser() acteur: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.utilisateursService.obtenirParId(acteur, id);
  }

  @Patch(':id')
  @RequirePermissions('UTILISATEUR_MODIFIER')
  async modifier(
    @CurrentUser() acteur: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateUtilisateurDto,
  ) {
    return this.utilisateursService.modifier(acteur, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('UTILISATEUR_DESACTIVER')
  @HttpCode(HttpStatus.NO_CONTENT)
  async desactiver(
    @CurrentUser() acteur: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    await this.utilisateursService.desactiver(acteur, id);
  }
}
