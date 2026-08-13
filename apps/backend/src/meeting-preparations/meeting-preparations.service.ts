import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, MoreThan, Repository } from 'typeorm';
import {
  CleaningTask,
  CleaningTaskRecurrence,
  CleaningTaskStatus,
} from '../cleaning-tasks/entities/cleaning-task.entity.js';
import {
  BookingStatus,
  RoomBooking,
} from '../meeting-rooms/entities/room-booking.entity.js';
import {
  MeetingPreparation,
  MeetingPreparationStatus,
} from './entities/meeting-preparation.entity.js';
import { MeetingPreparationParticipant } from './entities/meeting-preparation-participant.entity.js';
import {
  Employee,
  EmployeeScope,
} from '../employees/entities/employee.entity.js';

@Injectable()
export class MeetingPreparationsService {
  constructor(
    @InjectRepository(MeetingPreparation)
    private readonly repo: Repository<MeetingPreparation>,
    @InjectRepository(MeetingPreparationParticipant)
    private readonly participants: Repository<MeetingPreparationParticipant>,
    @InjectRepository(RoomBooking)
    private readonly bookings: Repository<RoomBooking>,
    @InjectRepository(CleaningTask)
    private readonly cleaningTasks: Repository<CleaningTask>,
    @InjectRepository(Employee)
    private readonly employees: Repository<Employee>,
    private readonly dataSource: DataSource,
  ) {}

  async list(companyId?: string, branchId?: string) {
    const bookings = await this.bookings.find({
      where: {
        ...(companyId ? { companyId } : {}),
        status: BookingStatus.CONFIRMED,
        startTime: MoreThan(new Date()),
      },
      relations: ['room'],
      order: { startTime: 'ASC' },
    });
    for (const booking of bookings.filter(
      (item) => !branchId || item.room?.branchId === branchId,
    )) {
      if (!(await this.repo.findOne({ where: { bookingId: booking.id } }))) {
        await this.repo.save(
          this.repo.create({
            bookingId: booking.id,
            companyId: booking.companyId,
            branchId: booking.room.branchId,
            assignedEmployeeId: null,
            status: MeetingPreparationStatus.PENDING,
            checklist: [
              { key: 'room', label: 'Room set up', done: false },
              { key: 'equipment', label: 'Equipment tested', done: false },
              {
                key: 'service',
                label: 'Drinks and service prepared',
                done: false,
              },
              { key: 'control', label: 'Final check', done: false },
            ],
            startedAt: null,
            readyAt: null,
            completedAt: null,
            verifiedBy: null,
          }),
        );
      }
    }
    const tasks = await this.repo.find({
      where: branchId ? { branchId } : companyId ? { companyId } : {},
      order: { createdAt: 'ASC' },
    });
    const memberships = tasks.length
      ? await this.participants.find({
          where: { preparationId: In(tasks.map((task) => task.id)) },
        })
      : [];
    return tasks.map((task) => ({
      ...task,
      participantEmployeeIds: memberships
        .filter((membership) => membership.preparationId === task.id)
        .map((membership) => membership.employeeId),
      booking:
        bookings.find((booking) => booking.id === task.bookingId) ?? null,
    }));
  }

  async one(id: string): Promise<MeetingPreparation> {
    const task = await this.repo.findOne({ where: { id } });
    if (!task)
      throw new NotFoundException(`Meeting preparation ${id} not found`);
    return task;
  }

  async assign(id: string, employeeId: string): Promise<MeetingPreparation> {
    const task = await this.one(id);
    if (
      [
        MeetingPreparationStatus.COMPLETED,
        MeetingPreparationStatus.VERIFIED,
      ].includes(task.status)
    )
      throw new BadRequestException('completedPreparationCannotBeAssigned');
    task.assignedEmployeeId = employeeId;
    task.status = MeetingPreparationStatus.ASSIGNED;
    return this.repo.save(task);
  }

  async setTeam(
    id: string,
    actorEmployeeId: string,
    participantEmployeeIds: string[],
    manager = false,
  ): Promise<MeetingPreparation & { participantEmployeeIds: string[] }> {
    const task = await this.one(id);
    if (!manager && task.assignedEmployeeId !== actorEmployeeId) {
      throw new ForbiddenException('onlyPreparationResponsibleCanManageTeam');
    }
    if (!task.assignedEmployeeId) {
      throw new BadRequestException('preparationResponsibleRequired');
    }
    if (
      [
        MeetingPreparationStatus.COMPLETED,
        MeetingPreparationStatus.VERIFIED,
      ].includes(task.status)
    ) {
      throw new BadRequestException('completedPreparationTeamCannotChange');
    }
    if (participantEmployeeIds.includes(task.assignedEmployeeId)) {
      throw new BadRequestException('responsibleCannotBeParticipant');
    }

    const uniqueIds = [...new Set(participantEmployeeIds)];
    const employees = uniqueIds.length
      ? await this.employees.findBy({ id: In(uniqueIds) })
      : [];
    if (
      employees.length !== uniqueIds.length ||
      employees.some(
        (employee) =>
          !employee.active ||
          employee.scope !== EmployeeScope.TARHIB ||
          employee.branchId !== task.branchId,
      )
    ) {
      throw new BadRequestException('invalidPreparationParticipant');
    }

    await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(MeetingPreparationParticipant);
      await repository.delete({ preparationId: id });
      if (uniqueIds.length) {
        await repository.save(
          uniqueIds.map((employeeId) =>
            repository.create({
              preparationId: id,
              employeeId,
              addedByEmployeeId: actorEmployeeId,
            }),
          ),
        );
      }
    });

    return { ...task, participantEmployeeIds: uniqueIds };
  }

  async start(
    id: string,
    employeeId: string,
    manager = false,
  ): Promise<MeetingPreparation> {
    const task = await this.one(id);
    this.assertAssignee(task, employeeId, manager);
    if (
      ![
        MeetingPreparationStatus.ASSIGNED,
        MeetingPreparationStatus.PENDING,
      ].includes(task.status)
    )
      throw new BadRequestException('preparationCannotBeStarted');
    if (!task.assignedEmployeeId) task.assignedEmployeeId = employeeId;
    task.status = MeetingPreparationStatus.IN_PROGRESS;
    task.startedAt = new Date();
    return this.repo.save(task);
  }

  async toggle(
    id: string,
    key: string,
    employeeId: string,
    manager = false,
  ): Promise<MeetingPreparation> {
    const task = await this.one(id);
    this.assertAssignee(task, employeeId, manager);
    if (task.status !== MeetingPreparationStatus.IN_PROGRESS)
      throw new BadRequestException('preparationIsNotInProgress');
    if (!task.checklist.some((item) => item.key === key))
      throw new NotFoundException(`Checklist item ${key} not found`);
    task.checklist = task.checklist.map((item) =>
      item.key === key ? { ...item, done: !item.done } : item,
    );
    return this.repo.save(task);
  }

  async transition(
    id: string,
    status: MeetingPreparationStatus,
    employeeId: string,
    manager = false,
  ): Promise<MeetingPreparation> {
    const task = await this.one(id);
    this.assertAssignee(task, employeeId, manager);
    if (status === MeetingPreparationStatus.READY) {
      if (
        task.status !== MeetingPreparationStatus.IN_PROGRESS ||
        task.checklist.some((item) => !item.done)
      )
        throw new BadRequestException('checklistMustBeCompleted');
      task.readyAt = new Date();
    } else if (status === MeetingPreparationStatus.COMPLETED) {
      if (task.status !== MeetingPreparationStatus.READY)
        throw new BadRequestException('preparationIsNotReady');
      task.completedAt = new Date();
      await this.createCleanupTask(task.bookingId);
    } else if (status === MeetingPreparationStatus.VERIFIED) {
      if (!manager || task.status !== MeetingPreparationStatus.COMPLETED)
        throw new BadRequestException('onlyCompletedPreparationsCanBeVerified');
      task.verifiedBy = employeeId;
    } else {
      throw new BadRequestException('unsupportedPreparationTransition');
    }
    task.status = status;
    return this.repo.save(task);
  }

  private assertAssignee(
    task: MeetingPreparation,
    employeeId: string,
    manager: boolean,
  ): void {
    if (!manager && task.assignedEmployeeId !== employeeId)
      throw new ForbiddenException('preparationNotAssignedToEmployee');
  }

  private async createCleanupTask(bookingId: string): Promise<void> {
    if (
      await this.cleaningTasks.findOne({
        where: { sourceBookingId: bookingId },
      })
    )
      return;
    const booking = await this.bookings.findOne({
      where: { id: bookingId },
      relations: ['room'],
    });
    if (!booking?.room) return;
    await this.cleaningTasks.save(
      this.cleaningTasks.create({
        companyId: booking.companyId,
        branchId: booking.room.branchId,
        title: `Meeting room reset · ${booking.room.nameEn}`,
        description: `${booking.room.nameAr} / ${booking.room.nameEn}`,
        sourceBookingId: booking.id,
        roomId: booking.roomId,
        scheduledStartAt: booking.endTime,
        scheduledEndAt: new Date(booking.endTime.getTime() + 30 * 60_000),
        assignedEmployeeId: null,
        status: CleaningTaskStatus.PENDING,
        dueDate: booking.endTime.toISOString().slice(0, 10),
        recurrence: CleaningTaskRecurrence.ONCE,
        completedAt: null,
        verifiedByEmployeeId: null,
        verifiedAt: null,
        notes: null,
      }),
    );
  }
}
