import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('meeting_preparation_participants')
export class MeetingPreparationParticipant {
  @PrimaryColumn({ name: 'preparation_id', type: 'uuid' })
  preparationId!: string;

  @PrimaryColumn({ name: 'employee_id', type: 'uuid' })
  employeeId!: string;

  @Column({ name: 'added_by_employee_id', type: 'uuid' })
  addedByEmployeeId!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
