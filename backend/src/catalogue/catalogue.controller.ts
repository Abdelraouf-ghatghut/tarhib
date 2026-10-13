import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CatalogueService } from './catalogue.service';

@Controller('catalog')
@UseGuards(JwtAuthGuard)
export class CatalogueController {
  constructor(private readonly catalogueService: CatalogueService) {}

  @Get()
  async lister(@CurrentUser() utilisateur: AuthenticatedUser) {
    return this.catalogueService.getCatalogue(utilisateur);
  }
}
