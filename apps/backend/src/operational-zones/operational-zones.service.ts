import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThanOrEqual, MoreThan, Repository } from 'typeorm';
import {
  Employee,
  EmployeeScope,
} from '../employees/entities/employee.entity.js';
import { EmployeeZoneAssignment } from './entities/employee-zone-assignment.entity.js';
import {
  OperationalZone,
  OperationalZoneType,
} from './entities/operational-zone.entity.js';

@Injectable()
export class OperationalZonesService {
  constructor(
    @InjectRepository(OperationalZone)
    private readonly zones: Repository<OperationalZone>,
    @InjectRepository(EmployeeZoneAssignment)
    private readonly assignments: Repository<EmployeeZoneAssignment>,
    @InjectRepository(Employee)
    private readonly employees: Repository<Employee>,
  ) {}

  findAll(
    filters: Partial<Pick<OperationalZone, 'companyId' | 'branchId' | 'type'>>,
  ) {
    return this.zones.find({ where: filters, order: { nameAr: 'ASC' } });
  }

  async findOne(id: string): Promise<OperationalZone> {
    const zone = await this.zones.findOne({ where: { id } });
    if (!zone) throw new NotFoundException('operationalZoneNotFound');
    return zone;
  }

  create(input: Partial<OperationalZone>): Promise<OperationalZone> {
    const floors = [
      ...new Set((input.floors ?? []).map((floor) => floor.trim())),
    ].filter(Boolean);
    if (!floors.length) throw new BadRequestException('zoneFloorsRequired');
    return this.zones.save(this.zones.create({ ...input, floors }));
  }

  async assign(
    zoneId: string,
    employeeId: string,
    assignedBy: string,
    startsAt = new Date(),
    endsAt: Date | null = null,
  ): Promise<EmployeeZoneAssignment> {
    const [zone, employee] = await Promise.all([
      this.findOne(zoneId),
      this.employees.findOne({ where: { id: employeeId } }),
    ]);
    if (
      !employee?.active ||
      employee.scope !== EmployeeScope.TARHIB ||
      employee.branchId !== zone.branchId
    ) {
      throw new BadRequestException('invalidZoneEmployee');
    }
    if (endsAt && endsAt <= startsAt) {
      throw new BadRequestException('zoneAssignmentEndMustBeAfterStart');
    }
    const existing = await this.assignments.findOne({
      where: { zoneId, employeeId, active: true },
    });
    if (existing) throw new BadRequestException('activeZoneAssignmentExists');
    return this.assignments.save(
      this.assignments.create({
        zoneId,
        employeeId,
        assignedBy,
        startsAt,
        endsAt,
        active: true,
      }),
    );
  }

  async setAssignmentActive(id: string, active: boolean) {
    const assignment = await this.findAssignment(id);
    assignment.active = active;
    return this.assignments.save(assignment);
  }

  async findAssignment(id: string): Promise<EmployeeZoneAssignment> {
    const assignment = await this.assignments.findOne({ where: { id } });
    if (!assignment) throw new NotFoundException('zoneAssignmentNotFound');
    return assignment;
  }

  findAssignments(zoneId: string): Promise<EmployeeZoneAssignment[]> {
    return this.assignments.find({
      where: { zoneId },
      order: { active: 'DESC', startsAt: 'DESC' },
    });
  }

  async mine(employeeId: string): Promise<OperationalZone[]> {
    const now = new Date();
    const activeAssignments = await this.assignments.find({
      where: [
        {
          employeeId,
          active: true,
          startsAt: LessThanOrEqual(now),
          endsAt: IsNull(),
        },
        {
          employeeId,
          active: true,
          startsAt: LessThanOrEqual(now),
          endsAt: MoreThan(now),
        },
      ],
    });
    if (!activeAssignments.length) return [];
    const ids = new Set(
      activeAssignments.map((assignment) => assignment.zoneId),
    );
    return (await this.zones.find({ where: { active: true } })).filter((zone) =>
      ids.has(zone.id),
    );
  }

  async assignedFloors(
    employeeId: string,
    type: OperationalZoneType,
  ): Promise<Set<string>> {
    const zones = (await this.mine(employeeId)).filter(
      (zone) => zone.type === type,
    );
    return new Set(
      zones.flatMap((zone) => zone.floors.map((floor) => this.floorKey(floor))),
    );
  }

  floorKey(floor: string): string {
    return floor.trim().toLocaleLowerCase();
  }
}
