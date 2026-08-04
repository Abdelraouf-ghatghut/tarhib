import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OrderLine } from './order-line.entity.js';
import { OrderStatus } from '../dto/order.dto.js';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'employee_id' })
  employeeId!: string;

  @Column({ name: 'branch_id' })
  branchId!: string;

  @Column({ name: 'company_id' })
  companyId!: string;

  // Court, propre à la société (1, 2, 3…) — affiché à la place de `id`
  // (UUID) partout côté admin/agent. Attribué via company_order_counters.
  @Column({ name: 'order_number', type: 'int' })
  orderNumber!: number;

  @Column({ type: 'varchar', length: 20, default: OrderStatus.PENDING })
  status!: OrderStatus;

  // Code du niveau SLA (défauts P1..P5 ou code personnalisé de l'entreprise)
  @Column({ type: 'varchar', length: 20 })
  priority!: string;

  @Column({ name: 'sla_deadline', type: 'timestamptz' })
  slaDeadline!: Date;

  // Commentaire libre de l'employé au moment de la commande (CDC §7 — panier)
  @Column({ type: 'varchar', length: 500, nullable: true })
  note!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  /**
   * Horodatage + acteur (identité Keycloak de l'appelant, pas employees.id)
   * de chaque étape de préparation/livraison — alimente les temps moyens et
   * le rapport de performance agents.
   */
  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt!: Date | null;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy!: string | null;

  @Column({ name: 'rejected_at', type: 'timestamptz', nullable: true })
  rejectedAt!: Date | null;

  @Column({ name: 'rejected_by', type: 'uuid', nullable: true })
  rejectedBy!: string | null;

  /** Annulation volontaire de l'employé propriétaire (D13) — distincte de
   * rejected_at/by pour ne pas fausser un rapport filtré sur les rejets. */
  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt!: Date | null;

  @Column({ name: 'cancelled_by', type: 'uuid', nullable: true })
  cancelledBy!: string | null;

  @Column({ name: 'prep_started_at', type: 'timestamptz', nullable: true })
  prepStartedAt!: Date | null;

  @Column({ name: 'prepared_by', type: 'uuid', nullable: true })
  preparedBy!: string | null;

  @Column({ name: 'ready_at', type: 'timestamptz', nullable: true })
  readyAt!: Date | null;

  @Column({ name: 'ready_by', type: 'uuid', nullable: true })
  readyBy!: string | null;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt!: Date | null;

  @Column({ name: 'delivered_by', type: 'uuid', nullable: true })
  deliveredBy!: string | null;

  /**
   * Idempotence (D8, PR-0.4) : clé de retry fournie par le client, unique par
   * (employee_id, client_request_id) — cf. migration IntegritySchema. Null
   * = ancien client sans clé (comportement inchangé).
   */
  @Column({ name: 'client_request_id', type: 'uuid', nullable: true })
  clientRequestId!: string | null;

  /** Empreinte du panier (computeOrderRequestHash) — détecte une réutilisation
   * de clé avec un payload différent. */
  @Column({
    name: 'client_request_hash',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  clientRequestHash!: string | null;

  // PR-0.1a : eager RETIRÉ délibérément (F2) — un eager sur cette relation
  // transforme tout Repository.findOne() en LEFT JOIN, ce qui invalide un
  // verrou FOR UPDATE posé côté nullable (PostgreSQL : "FOR UPDATE cannot be
  // applied to the nullable side of an outer join"). Tous les appelants
  // demandent déjà explicitement `relations: ['lines']` quand ils en ont
  // besoin (cf. orders.service.ts) ; le verrou de commande (updateStatus,
  // delivery.service.ts) reste une requête SANS jointure par construction.
  @OneToMany(() => OrderLine, (line) => line.order, {
    cascade: true,
  })
  lines!: OrderLine[];
}
