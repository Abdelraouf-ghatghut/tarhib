import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, LessThan, Repository } from 'typeorm';
import { MeetingRoom } from './entities/meeting-room.entity.js';
import { RoomBooking, BookingStatus } from './entities/room-booking.entity.js';
import { MeetingServicePackage } from '../meeting-service-packages/entities/meeting-service-package.entity.js';
import { Role, RoleScope } from '../roles/entities/role.entity.js';
import {
  BookingDto,
  CreateBookingDto,
  CreateMeetingRoomDto,
  MeetingRoomDto,
  OrderMeetingServicesDto,
  UpdateMeetingRoomDto,
} from './dto/meeting-room.dto.js';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';

@Injectable()
export class MeetingRoomsService {
  constructor(
    @InjectRepository(MeetingRoom)
    private readonly roomRepo: Repository<MeetingRoom>,
    @InjectRepository(RoomBooking)
    private readonly bookingRepo: Repository<RoomBooking>,
    @InjectRepository(MeetingServicePackage)
    private readonly packageRepo: Repository<MeetingServicePackage>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
  ) {}

  /**
   * Salles accessibles selon les rôles du caller (règle §4 : filtrage côté
   * API, jamais seulement côté UI). Retourne null si non restreint : rôle
   * interne Tarhib, aucun rôle dynamique, ou au moins un rôle client en
   * « toutes les salles » (allRoomsAllowed).
   */
  private async allowedRoomIdsFor(
    caller: JwtPayload,
  ): Promise<Set<string> | null> {
    const roleIds = caller.roleIds?.length
      ? caller.roleIds
      : caller.roleId
        ? [caller.roleId]
        : [];
    if (roleIds.length === 0) return null;

    const roles = await this.roleRepo.find({
      where: roleIds.map((id) => ({ id })),
      relations: ['allowedRooms'],
    });
    if (roles.length === 0) return null;
    if (roles.some((r) => r.scope === RoleScope.TARHIB)) return null;
    if (roles.some((r) => r.allRoomsAllowed)) return null;

    return new Set(
      roles.flatMap((r) => (r.allowedRooms ?? []).map((room) => room.id)),
    );
  }

  async createRoom(dto: CreateMeetingRoomDto): Promise<MeetingRoomDto> {
    const room = this.roomRepo.create({
      nameAr: dto.nameAr,
      nameEn: dto.nameEn?.trim() || dto.nameAr,
      branchId: dto.branchId,
      companyId: dto.companyId,
      capacity: dto.capacity ?? 10,
      amenities: dto.amenities ?? null,
      active: true,
    });
    const saved = await this.roomRepo.save(room);
    return this.roomToDto(saved);
  }

  async updateRoom(
    id: string,
    dto: UpdateMeetingRoomDto,
  ): Promise<MeetingRoomDto> {
    const room = await this.roomRepo.findOne({ where: { id } });
    if (!room) throw new NotFoundException(`Room ${id} not found`);
    Object.assign(room, dto);
    const saved = await this.roomRepo.save(room);
    return this.roomToDto(saved);
  }

  async deleteRoom(id: string): Promise<void> {
    const room = await this.roomRepo.findOne({ where: { id } });
    if (!room) throw new NotFoundException(`Room ${id} not found`);
    await this.roomRepo.remove(room);
  }

  async findAllRoomsAdmin(companyId?: string): Promise<MeetingRoomDto[]> {
    const where = companyId ? { companyId } : {};
    const rooms = await this.roomRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
    return rooms.map(this.roomToDto);
  }

  async findRooms(caller: JwtPayload): Promise<MeetingRoomDto[]> {
    const rooms = await this.roomRepo.find({
      where: { companyId: caller.companyId, active: true },
    });
    const allowed = await this.allowedRoomIdsFor(caller);
    const visible = allowed ? rooms.filter((r) => allowed.has(r.id)) : rooms;
    return visible.map(this.roomToDto);
  }

  async createBooking(
    roomId: string,
    dto: CreateBookingDto,
    caller: JwtPayload,
  ): Promise<BookingDto> {
    const room = await this.roomRepo.findOne({ where: { id: roomId } });
    if (!room) throw new NotFoundException(`Room ${roomId} not found`);
    if (room.companyId !== caller.companyId)
      throw new ForbiddenException('crossTenantAccessDenied');

    // Revérifié à la réservation, pas seulement au listing : le rôle a pu
    // changer entre les deux.
    const allowed = await this.allowedRoomIdsFor(caller);
    if (allowed && !allowed.has(roomId)) {
      throw new ForbiddenException('roomNotAllowedForRole');
    }

    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);
    if (start >= end) throw new BadRequestException('startTimeBeforeEndTime');

    const conflict = await this.bookingRepo.findOne({
      where: {
        roomId,
        status: BookingStatus.CONFIRMED,
        startTime: LessThan(end),
        endTime: MoreThan(start),
      },
    });
    if (conflict) throw new BadRequestException('roomAlreadyBooked');

    // Package de service (نوع الخدمة) : snapshot bilingue dans le jsonb
    // `services` pour que l'admin l'affiche sans jointure, même si le
    // package est renommé/supprimé plus tard.
    let services: Record<string, unknown> | null = null;
    if (dto.packageId) {
      const pkg = await this.packageRepo.findOne({
        where: { id: dto.packageId },
      });
      if (!pkg)
        throw new NotFoundException(`Package ${dto.packageId} not found`);
      if (pkg.companyId !== caller.companyId)
        throw new ForbiddenException('crossTenantAccessDenied');
      if (!pkg.isActive) throw new BadRequestException('packageInactive');
      services = {
        packageId: pkg.id,
        packageNameAr: pkg.nameAr,
        packageNameEn: pkg.nameEn,
        packageType: pkg.type,
      };
    }

    const booking = this.bookingRepo.create({
      roomId,
      employeeId: caller.sub,
      companyId: caller.companyId,
      startTime: start,
      endTime: end,
      status: BookingStatus.CONFIRMED,
      services,
    });
    const saved = await this.bookingRepo.save(booking);
    return this.bookingToDto(saved);
  }

  /** Réservations d'une salle, toutes confondues (vue admin). */
  async findRoomBookings(roomId: string): Promise<BookingDto[]> {
    const room = await this.roomRepo.findOne({ where: { id: roomId } });
    if (!room) throw new NotFoundException(`Room ${roomId} not found`);
    const bookings = await this.bookingRepo.find({
      where: { roomId },
      order: { startTime: 'DESC' },
    });
    return bookings.map(this.bookingToDto);
  }

  /**
   * Réservations confirmées à venir, toute la société — pour que l'agent
   * d'hospitalité prépare le service (café/collations/installation) en
   * amont de chaque réunion, sans avoir à connaître la salle à l'avance.
   */
  async findUpcomingBookings(caller: JwtPayload): Promise<BookingDto[]> {
    const bookings = await this.bookingRepo.find({
      where: {
        companyId: caller.companyId,
        status: BookingStatus.CONFIRMED,
        startTime: MoreThan(new Date()),
      },
      order: { startTime: 'ASC' },
      take: 30,
    });
    return bookings.map(this.bookingToDto);
  }

  async findMyBookings(caller: JwtPayload): Promise<BookingDto[]> {
    const bookings = await this.bookingRepo.find({
      where: { employeeId: caller.sub, companyId: caller.companyId },
      order: { startTime: 'ASC' },
    });
    return bookings.map(this.bookingToDto);
  }

  async cancelBooking(bookingId: string, caller: JwtPayload): Promise<void> {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
    });
    if (!booking) throw new NotFoundException(`Booking ${bookingId} not found`);
    if (
      booking.employeeId !== caller.sub &&
      !caller.permissions?.includes('meeting.manage')
    ) {
      throw new ForbiddenException('canOnlyCancelOwnBookings');
    }
    booking.status = BookingStatus.CANCELLED;
    await this.bookingRepo.save(booking);
  }

  async orderServices(
    bookingId: string,
    dto: OrderMeetingServicesDto,
    caller: JwtPayload,
  ): Promise<BookingDto> {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
    });
    if (!booking) throw new NotFoundException(`Booking ${bookingId} not found`);
    if (
      booking.employeeId !== caller.sub &&
      !caller.permissions?.includes('meeting.manage')
    ) {
      throw new ForbiddenException('permissionDenied');
    }
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException(
        'Can only order services for confirmed bookings',
      );
    }

    booking.services = { ...dto.services, note: dto.note ?? null };
    const saved = await this.bookingRepo.save(booking);
    return this.bookingToDto(saved);
  }

  private roomToDto = (r: MeetingRoom): MeetingRoomDto => ({
    id: r.id,
    branchId: r.branchId,
    companyId: r.companyId,
    nameAr: r.nameAr,
    nameEn: r.nameEn,
    capacity: r.capacity,
    amenities: r.amenities,
    active: r.active,
  });

  private bookingToDto = (b: RoomBooking): BookingDto => ({
    id: b.id,
    roomId: b.roomId,
    employeeId: b.employeeId,
    startTime: b.startTime.toISOString(),
    endTime: b.endTime.toISOString(),
    status: b.status,
    services: b.services,
    createdAt: b.createdAt.toISOString(),
  });
}
