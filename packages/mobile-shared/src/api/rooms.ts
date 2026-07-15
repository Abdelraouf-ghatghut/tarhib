import { api } from "./client";

// Aligné sur apps/backend/src/meeting-rooms/dto/meeting-room.dto.ts
export interface MeetingRoom {
  id: string;
  branchId: string;
  companyId: string;
  nameAr: string;
  nameEn: string;
  capacity: number;
  amenities: Record<string, unknown> | null;
  active: boolean;
}

/** Snapshot du package posé à la réservation (نوع الخدمة). */
export interface BookingServices {
  packageId?: string;
  packageNameAr?: string;
  packageNameEn?: string;
  packageType?: string;
  [key: string]: unknown;
}

export interface RoomBooking {
  id: string;
  roomId: string;
  employeeId: string;
  startTime: string;
  endTime: string;
  status: string;
  services: BookingServices | null;
  createdAt: string;
}

// Aligné sur apps/backend/src/meeting-service-packages
export type ServicePackageType = "BREAKFAST" | "LUNCH" | "CUSTOM";

export interface ServicePackage {
  id: string;
  companyId: string;
  nameAr: string;
  nameEn: string;
  type: ServicePackageType;
  descriptionAr: string | null;
  descriptionEn: string | null;
  isActive: boolean;
}

/** Packages de service actifs de la société (نوع الخدمة). */
export async function fetchServicePackages(companyId: string): Promise<ServicePackage[]> {
  const { data } = await api.get<ServicePackage[]>("/meeting-service-packages", {
    params: { companyId },
  });
  return data;
}

/** Salles visibles par l'employé connecté (scopées branche côté serveur). */
export async function fetchRooms(): Promise<MeetingRoom[]> {
  const { data } = await api.get<MeetingRoom[]>("/meeting-rooms");
  return data;
}

export async function createBooking(
  roomId: string,
  startTime: string,
  endTime: string,
  packageId?: string,
): Promise<RoomBooking> {
  const { data } = await api.post<RoomBooking>(`/meeting-rooms/${roomId}/bookings`, {
    startTime,
    endTime,
    ...(packageId ? { packageId } : {}),
  });
  return data;
}

export async function fetchMyBookings(): Promise<RoomBooking[]> {
  const { data } = await api.get<RoomBooking[]>("/meeting-rooms/bookings/me");
  return data;
}

/** Réservations confirmées à venir, toute la société — préparation du service. */
export async function fetchUpcomingBookings(): Promise<RoomBooking[]> {
  const { data } = await api.get<RoomBooking[]>("/meeting-rooms/bookings/upcoming");
  return data;
}

export async function cancelBooking(bookingId: string): Promise<void> {
  await api.delete(`/meeting-rooms/bookings/${bookingId}`);
}
