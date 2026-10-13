import { StatutCommande } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateStatutCommandeDto {
  @IsEnum(StatutCommande, { message: 'Statut invalide' })
  statut: StatutCommande;
}
