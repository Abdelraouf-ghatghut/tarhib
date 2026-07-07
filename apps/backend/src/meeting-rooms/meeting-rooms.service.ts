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
  ) {}

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
    return rooms.map(this.roomToDto);
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

    const booking = this.bookingRepo.create({
      roomId,
      employeeId: caller.sub,
      companyId: caller.companyId,
      startTime: start,
      endTime: end,
      status: BookingStatus.CONFIRMED,
    });
    const saved = await this.bookingRepo.save(booking);
    return this.bookingToDto(saved);
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
