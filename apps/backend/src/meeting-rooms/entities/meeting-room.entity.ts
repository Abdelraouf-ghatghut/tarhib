import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RoomBooking } from './room-booking.entity.js';

@Entity('meeting_rooms')
export class MeetingRoom {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'branch_id' })
  branchId!: string;

  @Column({ name: 'company_id' })
  companyId!: string;

  @Column({ name: 'name_ar', type: 'varchar', length: 200 })
  nameAr!: string;

  @Column({ name: 'name_en', type: 'varchar', length: 200 })
  nameEn!: string;

  @Column({ type: 'int', default: 10 })
  capacity!: number;

  @Column({ type: 'jsonb', nullable: true })
  amenities!: Record<string, unknown> | null;

  @Column({ default: true })
  active!: boolean;

  @OneToMany(() => RoomBooking, (b) => b.room)
  bookings!: RoomBooking[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
