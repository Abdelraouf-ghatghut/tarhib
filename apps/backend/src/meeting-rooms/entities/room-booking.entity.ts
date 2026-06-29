import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MeetingRoom } from './meeting-room.entity.js';

export enum BookingStatus {
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

@Entity('room_bookings')
export class RoomBooking {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'room_id' })
  roomId!: string;

  @ManyToOne(() => MeetingRoom, (r) => r.bookings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id' })
  room!: MeetingRoom;

  @Column({ name: 'employee_id' })
  employeeId!: string;

  @Column({ name: 'company_id' })
  companyId!: string;

  @Column({ name: 'start_time', type: 'timestamptz' })
  startTime!: Date;

  @Column({ name: 'end_time', type: 'timestamptz' })
  endTime!: Date;

  @Column({
    type: 'varchar',
    length: 20,
    default: BookingStatus.CONFIRMED,
  })
  status!: BookingStatus;

  /** Services ordered for this meeting (drinks, snacks, etc.) */
  @Column({ type: 'jsonb', nullable: true })
  services!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
