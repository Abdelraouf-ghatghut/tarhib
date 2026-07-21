import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Fournisseur = ressource propre à Tarhib (le prestataire), pas à une
 * société cliente — pas de scoping par company_id, partagé pour l'achat
 * sur toutes les branches de toutes les sociétés.
 */
@Entity('suppliers')
export class Supplier {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'name_ar' })
  nameAr!: string;

  @Column({ name: 'name_en', type: 'varchar', nullable: true })
  nameEn!: string | null;

  @Column({ name: 'contact_name', type: 'varchar', nullable: true })
  contactName!: string | null;

  @Column({ type: 'varchar', nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone!: string | null;

  @Column({ type: 'text', nullable: true })
  address!: string | null;

  @Column({ default: true })
  active!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
