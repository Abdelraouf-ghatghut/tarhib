import { IsNotEmpty, IsPositive, IsUUID } from 'class-validator';

export class LigneCommandeDto {
  @IsNotEmpty({ message: 'Produit requis' })
  @IsUUID()
  produit_id: string;

  @IsPositive({ message: 'Quantité doit être positive' })
  quantite: number;
}
