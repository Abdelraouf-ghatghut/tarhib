import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { RequirePermission } from '../auth/decorators/require-permission.decorator.js';
import { RequireAnyPermission } from '../auth/decorators/require-permission.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
import { MeetingRoomsService } from './meeting-rooms.service.js';
import {
  CreateBookingDto,
  CreateMeetingRoomDto,
  OrderMeetingServicesDto,
  UpdateMeetingRoomDto,
} from './dto/meeting-room.dto.js';

@ApiTags('meeting-rooms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('meeting-rooms')
export class MeetingRoomsController {
  constructor(private readonly service: MeetingRoomsService) {}

  @Get('admin/all')
  @RequirePermission('branch.manage')
  @ApiOperation({ summary: 'Liste toutes les salles (admin, cross-branch)' })
  @ApiQuery({ name: 'companyId', required: false })
  findAllAdmin(@Query('companyId') companyId?: string) {
    return this.service.findAllRoomsAdmin(companyId);
  }

  @Post()
  @RequirePermission('branch.manage')
  @ApiOperation({ summary: 'Créer une salle de réunion (admin)' })
  createRoom(@Body() dto: CreateMeetingRoomDto) {
    return this.service.createRoom(dto);
  }

  @Patch(':id')
  @RequirePermission('branch.manage')
  @ApiOperation({ summary: 'Mettre à jour une salle de réunion (admin)' })
  updateRoom(@Param('id') id: string, @Body() dto: UpdateMeetingRoomDto) {
    return this.service.updateRoom(id, dto);
  }

  @Delete(':id')
  @RequirePermission('branch.manage')
  @HttpCode(204)
  @ApiOperation({ summary: 'Supprimer une salle de réunion (admin)' })
  deleteRoom(@Param('id') id: string) {
    return this.service.deleteRoom(id);
  }

  @Get()
  @RequirePermission('catalog.view')
  @ApiOperation({ summary: 'Lister les salles disponibles (employé)' })
  findRooms(@CurrentUser() caller: JwtPayload) {
    return this.service.findRooms(caller);
  }

  @Get(':roomId/bookings')
  @RequirePermission('branch.manage')
  @ApiOperation({ summary: "Réservations d'une salle (admin)" })
  findRoomBookings(@Param('roomId') roomId: string) {
    return this.service.findRoomBookings(roomId);
  }

  @Post(':roomId/bookings')
  @RequirePermission('meeting.book')
  createBooking(
    @Param('roomId') roomId: string,
    @Body() dto: CreateBookingDto,
    @CurrentUser() caller: JwtPayload,
  ) {
    return this.service.createBooking(roomId, dto, caller);
  }

  @Get('bookings/me')
  @RequirePermission('meeting.book')
  myBookings(@CurrentUser() caller: JwtPayload) {
    return this.service.findMyBookings(caller);
  }

  @Get('bookings/upcoming')
  @RequireAnyPermission(
    'meeting.order_services',
    'meeting.preparation.view',
    'meeting.preparation.execute',
    'meeting.preparation.manage',
  )
  @ApiOperation({
    summary:
      "Réservations confirmées à venir (toute la société) — préparation du service par l'agent d'hospitalité",
  })
  upcomingBookings(@CurrentUser() caller: JwtPayload) {
    return this.service.findUpcomingBookings(caller);
  }

  @Delete('bookings/:bookingId')
  @RequirePermission('meeting.book')
  @HttpCode(204)
  cancelBooking(
    @Param('bookingId') bookingId: string,
    @CurrentUser() caller: JwtPayload,
  ) {
    return this.service.cancelBooking(bookingId, caller);
  }

  @Post('bookings/:bookingId/services')
  @RequirePermission('meeting.order_services')
  orderServices(
    @Param('bookingId') bookingId: string,
    @Body() dto: OrderMeetingServicesDto,
    @CurrentUser() caller: JwtPayload,
  ) {
    return this.service.orderServices(bookingId, dto, caller);
  }
}
