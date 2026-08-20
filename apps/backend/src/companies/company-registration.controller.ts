import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CompanyRegistrationService } from './company-registration.service.js';
import { ResolveCompanyRegistrationDto } from './dto/company-registration.dto.js';

@ApiTags('company-registration')
@Controller('auth/company-registration')
export class CompanyRegistrationController {
  constructor(private readonly registration: CompanyRegistrationService) {}

  @Post('resolve')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: "Valider le code d'inscription d'une entreprise" })
  resolve(@Body() dto: ResolveCompanyRegistrationDto) {
    return this.registration.resolve(dto.code);
  }

  @Get(':challenge/options')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({
    summary: "Lister les affectations publiées pour l'inscription",
  })
  options(@Param('challenge') challenge: string) {
    return this.registration.getPublicOptions(challenge);
  }
}
