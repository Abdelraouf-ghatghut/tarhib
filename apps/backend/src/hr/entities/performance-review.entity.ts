import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PerformanceReviewStatus {
  DRAFT = 'DRAFT',
  FINALIZED = 'FINALIZED',
}

@Entity('performance_reviews')
export class PerformanceReview {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId!: string;

  @Column({ name: 'reviewer_id', type: 'uuid' })
  reviewerId!: string;

  @Column({ name: 'review_date', type: 'date' })
  reviewDate!: string;

  /** Échelle 1-5. */
  @Column({ type: 'int' })
  rating!: number;

  @Column({ type: 'text', nullable: true })
  strengths!: string | null;

  @Column({ name: 'areas_for_improvement', type: 'text', nullable: true })
  areasForImprovement!: string | null;

  @Column({ type: 'text', nullable: true })
  comments!: string | null;

  @Column({
    type: 'varchar',
    length: 10,
    default: PerformanceReviewStatus.DRAFT,
  })
  status!: PerformanceReviewStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
