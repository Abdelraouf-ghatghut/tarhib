import { Module } from '@nestjs/common';
import { StocksModule } from '../stocks/stocks.module';
import { CommandesController } from './commandes.controller';
import { CommandesService } from './commandes.service';
import { CommandeStatutService } from './commande-statut.service';
import { CommandeValidationService } from './commande-validation.service';

@Module({
  imports: [StocksModule],
  controllers: [CommandesController],
  providers: [
    CommandesService,
    CommandeValidationService,
    CommandeStatutService,
  ],
  exports: [CommandesService, CommandeValidationService, CommandeStatutService],
})
export class CommandesModule {}
