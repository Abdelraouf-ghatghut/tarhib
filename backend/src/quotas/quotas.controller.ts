import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { QuotasService } from './quotas.service';

@Controller('quotas')
@UseGuards(JwtAuthGuard)
export class QuotasController {
  constructor(private readonly quotasService: QuotasService) {}

  @Get('me')
  async moi(@CurrentUser() utilisateur: AuthenticatedUser) {
    return this.quotasService.getQuotasUtilisateur(utilisateur);
  }
}
