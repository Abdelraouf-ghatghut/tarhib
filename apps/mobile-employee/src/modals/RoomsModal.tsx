import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import React, { useEffect, useMemo, useState } from "react";
import { Image, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  Card,
  PrimaryButton,
  cancelBooking,
  createBooking,
  createSnowStyles,
  directionalIcon,
  fetchMyBookings,
  fetchRooms,
  fetchServicePackages,
  spacing,
  useAuthStore,
  type Lang,
  type MeetingRoom,
  type RoomBooking,
  type ServicePackage,
  type SnowTheme,
} from "@tarhib/mobile-shared";

import { ConfettiDots, ModalHeader, NoteBanner, Stepper, SummaryRow, ui } from "../components/ui";
import { arOrEn } from "../lib/format";

const MINUTE_STEP = 15;
const MINUTES_IN_DAY = 24 * 60;

type Mode = "list" | "detail" | "form" | "bookings" | "booking-detail" | "confirmation";
type DayPeriod = "morning" | "evening";

interface Amenity {
  icon: keyof typeof Ionicons.glyphMap;
  labelAr: string;
  labelEn: string;
}

/** Catalogue d'icônes/libellés — les clés sont normalisées (minuscules, sans accents). */
const AMENITY_CATALOG: Record<string, Amenity> = {
  projector: { icon: "tv-outline", labelAr: "جهاز عرض", labelEn: "Projector" },
  projecteur: { icon: "tv-outline", labelAr: "جهاز عرض", labelEn: "Projector" },
  screen: { icon: "tv-outline", labelAr: "شاشة عرض", labelEn: "Display screen" },
  whiteboard: { icon: "create-outline", labelAr: "لوح تفاعلي", labelEn: "Whiteboard" },
  "tableau blanc": { icon: "create-outline", labelAr: "لوح تفاعلي", labelEn: "Whiteboard" },
  videoconference: {
    icon: "videocam-outline",
    labelAr: "نظام مؤتمرات فيديو",
    labelEn: "Video conferencing",
  },
  visio: { icon: "videocam-outline", labelAr: "نظام مؤتمرات فيديو", labelEn: "Video conferencing" },
  wifi: { icon: "wifi-outline", labelAr: "واي فاي", labelEn: "Wi-Fi" },
  climatisation: { icon: "snow-outline", labelAr: "تكييف", labelEn: "Air conditioning" },
  ac: { icon: "snow-outline", labelAr: "تكييف", labelEn: "Air conditioning" },
  parking: { icon: "car-outline", labelAr: "موقف قريب", labelEn: "Nearby parking" },
};

/**
 * `amenities` n'a pas de forme fixe côté backend (tableau de libellés dans
 * seed.sql, objet de booléens dans seed-users.ts) — on gère les deux.
 */
function amenityKeys(amenities: Record<string, unknown> | null): string[] {
  if (!amenities) return [];
  if (Array.isArray(amenities)) {
    return amenities.filter((value): value is string => typeof value === "string");
  }
  return Object.entries(amenities)
    .filter(([, value]) => value === true)
    .map(([key]) => key);
}

function resolveAmenity(raw: string): Amenity {
  const normalized = raw.trim().toLowerCase();
  return (
    AMENITY_CATALOG[normalized] ?? { icon: "checkmark-circle-outline", labelAr: raw, labelEn: raw }
  );
}

function roomName(room: MeetingRoom, lang: Lang): string {
  return lang === "ar" ? room.nameAr : room.nameEn || room.nameAr;
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function formatMinutes(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

function minutesToDate(selectedDate: Date, minutes: number): Date {
  const date = new Date(selectedDate);
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return date;
}

function roundToMinuteStep(minutes: number): number {
  const rounded = Math.round(minutes / MINUTE_STEP) * MINUTE_STEP;
  return Math.max(0, Math.min(rounded, MINUTES_IN_DAY - MINUTE_STEP));
}

function packageTypeLabel(type: ServicePackage["type"], lang: Lang): string {
  if (type === "BREAKFAST") return arOrEn(lang, "فطور", "Breakfast");
  if (type === "LUNCH") return arOrEn(lang, "غداء", "Lunch");
  return arOrEn(lang, "مخصص", "Custom");
}

function formatBookingDate(value: string, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === "ar" ? "ar" : "en", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function formatBookingTime(value: string, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === "ar" ? "ar" : "en", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export const RoomsModal = ({
  visible,
  lang,
  theme,
  onClose,
}: {
  visible: boolean;
  lang: Lang;
  theme: SnowTheme;
  onClose: () => void;
}) => {
  const queryClient = useQueryClient();
  const companyId = useAuthStore((state) => state.companyId);
  const [mode, setMode] = useState<Mode>("form");
  const [selectedRoom, setSelectedRoom] = useState<MeetingRoom | null>(null);
  const [roomSearch, setRoomSearch] = useState("");
  const [participants, setParticipants] = useState(1);
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [period, setPeriod] = useState<DayPeriod>("morning");
  const [startMinutes, setStartMinutes] = useState(9 * 60);
  const [endMinutes, setEndMinutes] = useState(10 * 60);
  const [activeTimePicker, setActiveTimePicker] = useState<"start" | "end" | null>(null);
  const [packageId, setPackageId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [lastBooking, setLastBooking] = useState<RoomBooking | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<RoomBooking | null>(null);
  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingPeriod, setBookingPeriod] = useState<"upcoming" | "past">("upcoming");

  const roomsQuery = useQuery({
    queryKey: ["meeting-rooms"],
    queryFn: fetchRooms,
    enabled: visible,
  });
  const bookingsQuery = useQuery({
    queryKey: ["my-bookings"],
    queryFn: fetchMyBookings,
    enabled: visible,
  });
  const packagesQuery = useQuery({
    queryKey: ["service-packages", companyId],
    queryFn: () => fetchServicePackages(companyId!),
    enabled: visible && !!companyId,
  });

  useEffect(() => {
    if (!packageId && packagesQuery.data?.[0]) setPackageId(packagesQuery.data[0].id);
  }, [packageId, packagesQuery.data]);

  useEffect(() => {
    if (visible) setMode("form");
  }, [visible]);

  useEffect(() => {
    if (!selectedRoom && roomsQuery.data?.length) {
      setSelectedRoom(roomsQuery.data.find((room) => room.active) ?? roomsQuery.data[0] ?? null);
    }
  }, [roomsQuery.data, selectedRoom]);

  const roomsById = useMemo(
    () => new Map((roomsQuery.data ?? []).map((room) => [room.id, room])),
    [roomsQuery.data],
  );

  const filteredRooms = useMemo(() => {
    const search = roomSearch.trim().toLowerCase();
    return (roomsQuery.data ?? []).filter(
      (room) =>
        !search ||
        room.nameAr.toLowerCase().includes(search) ||
        (room.nameEn ?? "").toLowerCase().includes(search),
    );
  }, [roomSearch, roomsQuery.data]);

  const filteredBookings = useMemo(() => {
    const now = Date.now();
    const search = bookingSearch.trim().toLowerCase();
    return (bookingsQuery.data ?? []).filter((booking) => {
      const room = roomsById.get(booking.roomId);
      const name = room ? roomName(room, lang).toLowerCase() : booking.roomId.toLowerCase();
      const isPast = new Date(booking.endTime).getTime() < now || booking.status === "CANCELLED";
      return (bookingPeriod === "past" ? isPast : !isPast) && (!search || name.includes(search));
    });
  }, [bookingPeriod, bookingSearch, bookingsQuery.data, roomsById, lang]);

  const timeInvalid = endMinutes <= startMinutes;

  const applySelectedMinutes = (field: "start" | "end", nextMinutes: number) => {
    if (field === "start") {
      setStartMinutes(nextMinutes);
      setEndMinutes((current) =>
        current <= nextMinutes ? Math.min(nextMinutes + 60, MINUTES_IN_DAY - MINUTE_STEP) : current,
      );
      return;
    }
    setEndMinutes(nextMinutes);
  };

  const handleNativeTimeChange = (
    field: "start" | "end",
    event: DateTimePickerEvent,
    date?: Date,
  ) => {
    if (Platform.OS === "android") setActiveTimePicker(null);
    if (event.type === "dismissed" || !date) return;
    applySelectedMinutes(field, roundToMinuteStep(date.getHours() * 60 + date.getMinutes()));
  };

  const handleWebTimeChange = (field: "start" | "end", value: string) => {
    const [hour, minute] = value.split(":").map(Number);
    if (hour === undefined || minute === undefined || Number.isNaN(hour) || Number.isNaN(minute))
      return;
    applySelectedMinutes(field, roundToMinuteStep(hour * 60 + minute));
  };

  const selectPeriod = (nextPeriod: DayPeriod) => {
    setPeriod(nextPeriod);
    const nextStart = nextPeriod === "morning" ? 9 * 60 : 14 * 60;
    setStartMinutes(nextStart);
    setEndMinutes(nextStart + 60);
  };

  const selectSlot = (minutes: number) => {
    setStartMinutes(minutes);
    setEndMinutes(Math.min(minutes + 60, MINUTES_IN_DAY - MINUTE_STEP));
  };

  const openRoomDetail = (room: MeetingRoom) => {
    setSelectedRoom(room);
    setMode("detail");
  };

  const startBookingForm = () => {
    setParticipants(1);
    setSelectedDate(startOfDay(new Date()));
    selectPeriod("morning");
    setNotes("");
    setFormError(null);
    setMode("form");
  };

  const resetToList = () => {
    setRoomSearch("");
    setMode("form");
  };

  const bookMutation = useMutation({
    mutationFn: () => {
      if (!selectedRoom) throw new Error("no-room");
      return createBooking(
        selectedRoom.id,
        minutesToDate(selectedDate, startMinutes).toISOString(),
        minutesToDate(selectedDate, endMinutes).toISOString(),
        packageId ?? undefined,
      );
    },
    onSuccess: (booking) => {
      setFormError(null);
      setLastBooking(booking);
      void queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      setMode("confirmation");
    },
    onError: (error) => {
      const conflict =
        error instanceof AxiosError && [409, 400].includes(error.response?.status ?? 0);
      setFormError(
        conflict
          ? arOrEn(lang, "القاعة محجوزة في هذا الوقت", "The room is already booked at this time")
          : arOrEn(
              lang,
              "تعذر إتمام الحجز. حاول مرة أخرى",
              "Unable to complete the booking. Try again",
            ),
      );
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (bookingId: string) => cancelBooking(bookingId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["my-bookings"] }),
  });

  const handleBack = () => {
    if (mode === "detail") return setMode("list");
    if (mode === "booking-detail") return setMode("bookings");
    if (mode === "form") return onClose();
    if (mode === "confirmation" || mode === "bookings") return setMode("form");
    return onClose();
  };

  const headerTitle =
    mode === "list"
      ? arOrEn(lang, "قاعات الاجتماعات", "Meeting rooms")
      : mode === "detail"
        ? arOrEn(lang, "تفاصيل قاعة الاجتماعات", "Meeting room details")
        : mode === "form"
          ? arOrEn(lang, "حجز قاعة اجتماع", "Book a meeting room")
          : mode === "bookings"
            ? arOrEn(lang, "حجوزتي", "My bookings")
            : mode === "booking-detail"
              ? arOrEn(lang, "تفاصيل الحجز", "Booking details")
              : arOrEn(lang, "تأكيد الحجز", "Booking confirmed");

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView
        edges={["top", "bottom"]}
        style={[styles.root, { backgroundColor: theme.background }]}
      >
        {mode === "list" || mode === "form" ? (
          <PageHeader
            theme={theme}
            lang={lang}
            onBack={onClose}
            onOpenBookings={() => setMode("bookings")}
          />
        ) : (
          <ModalHeader theme={theme} lang={lang} title={headerTitle} onBack={handleBack} />
        )}

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {mode === "list" ? (
            <RoomListScreen
              theme={theme}
              lang={lang}
              roomsQuery={roomsQuery}
              rooms={filteredRooms}
              search={roomSearch}
              onSearch={setRoomSearch}
              onSelectRoom={openRoomDetail}
            />
          ) : mode === "detail" && selectedRoom ? (
            <RoomDetailScreen theme={theme} lang={lang} room={selectedRoom} />
          ) : mode === "form" && selectedRoom ? (
            <>
              {formError ? (
                <NoteBanner theme={theme} color={theme.danger} text={formError} />
              ) : null}
              <BookingFormScreen
                theme={theme}
                lang={lang}
                room={selectedRoom}
                rooms={roomsQuery.data ?? []}
                participants={participants}
                selectedDate={selectedDate}
                period={period}
                startMinutes={startMinutes}
                endMinutes={endMinutes}
                activeTimePicker={activeTimePicker}
                packages={packagesQuery.data ?? []}
                packageId={packageId}
                notes={notes}
                timeInvalid={timeInvalid}
                onParticipantsChange={setParticipants}
                onSelectRoom={setSelectedRoom}
                onSelectDate={setSelectedDate}
                onSelectPeriod={selectPeriod}
                onSelectSlot={selectSlot}
                onOpenTimePicker={setActiveTimePicker}
                onNativeTimeChange={handleNativeTimeChange}
                onWebTimeChange={handleWebTimeChange}
                onSelectPackage={setPackageId}
                onNotesChange={setNotes}
              />
            </>
          ) : mode === "bookings" ? (
            <BookingsView
              theme={theme}
              lang={lang}
              query={bookingsQuery}
              bookings={filteredBookings}
              roomsById={roomsById}
              search={bookingSearch}
              period={bookingPeriod}
              onSearch={setBookingSearch}
              onPeriodChange={setBookingPeriod}
              onViewDetails={(booking) => {
                setSelectedBooking(booking);
                setMode("booking-detail");
              }}
              onCancel={(id) => cancelMutation.mutate(id)}
              onBookAgain={(booking) => {
                const room = roomsById.get(booking.roomId);
                if (!room) return;
                setSelectedRoom(room);
                startBookingForm();
              }}
              onGoToRooms={() => setMode("form")}
            />
          ) : mode === "booking-detail" && selectedBooking ? (
            <BookingDetailScreen
              theme={theme}
              lang={lang}
              booking={selectedBooking}
              room={roomsById.get(selectedBooking.roomId)}
            />
          ) : mode === "confirmation" && selectedRoom && lastBooking ? (
            <ConfirmationScreen
              theme={theme}
              lang={lang}
              room={selectedRoom}
              booking={lastBooking}
              participants={participants}
              period={period}
            />
          ) : null}
        </ScrollView>

        {mode === "detail" && selectedRoom ? (
          <View
            style={[
              styles.footer,
              { backgroundColor: theme.surface, borderTopColor: theme.border },
            ]}
          >
            <PrimaryButton
              label={arOrEn(lang, "احجز هذه القاعة", "Book this room")}
              icon="calendar-outline"
              theme={theme}
              disabled={!selectedRoom.active}
              onPress={startBookingForm}
            />
          </View>
        ) : null}
        {mode === "form" ? (
          <View
            style={[
              styles.footer,
              { backgroundColor: theme.surface, borderTopColor: theme.border },
            ]}
          >
            <PrimaryButton
              label={
                bookMutation.isPending
                  ? arOrEn(lang, "جاري الحجز...", "Booking...")
                  : arOrEn(lang, "تأكيد الحجز", "Confirm booking")
              }
              icon="checkmark-circle-outline"
              theme={theme}
              pill
              disabled={
                !selectedRoom ||
                timeInvalid ||
                bookMutation.isPending ||
                (packagesQuery.data?.length ? !packageId : false)
              }
              onPress={() => bookMutation.mutate()}
            />
          </View>
        ) : null}
        {mode === "confirmation" ? (
          <View
            style={[
              styles.footer,
              { backgroundColor: theme.surface, borderTopColor: theme.border, gap: spacing.sm },
            ]}
          >
            <Pressable
              onPress={() => setMode("bookings")}
              style={[styles.confirmButton, { backgroundColor: theme.primary }]}
            >
              <Text style={styles.confirmButtonText}>
                {arOrEn(lang, "عرض حجوزاتي", "View my bookings")}
              </Text>
            </Pressable>
            <Pressable
              onPress={resetToList}
              style={[
                styles.confirmButtonOutline,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.confirmButtonOutlineText, { color: theme.text }]}>
                {arOrEn(lang, "حجز آخر", "Book another room")}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
};

const PageHeader = ({
  theme,
  lang,
  onBack,
  onOpenBookings,
}: {
  theme: SnowTheme;
  lang: Lang;
  onBack: () => void;
  onOpenBookings: () => void;
}) => (
  <View style={styles.header}>
    <Pressable
      onPress={onBack}
      style={[styles.headerButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
    >
      <Ionicons name={directionalIcon("arrow-back")} size={21} color={theme.muted} />
    </Pressable>
    <Text style={[styles.headerTitle, { color: theme.text }]}>
      {arOrEn(lang, "حجز قاعة", "Book a room")}
    </Text>
    <Pressable
      onPress={onOpenBookings}
      accessibilityRole="button"
      accessibilityLabel={arOrEn(lang, "فتح طلباتي", "Open my bookings")}
      style={styles.bookingsHeaderAction}
    >
      <Text style={[styles.bookingsHeaderText, { color: theme.primaryStrong }]}>
        {arOrEn(lang, "حجوزاتي", "My bookings")}
      </Text>
    </Pressable>
  </View>
);

const SegmentedControl = ({
  theme,
  options,
  value,
  onChange,
}: {
  theme: SnowTheme;
  options: Array<{ key: string; label: string; icon: keyof typeof Ionicons.glyphMap }>;
  value: string;
  onChange: (value: string) => void;
}) => (
  <View style={[styles.segmented, { backgroundColor: theme.surface, borderColor: theme.border }]}>
    {options.map((option) => {
      const active = value === option.key;
      return (
        <Pressable
          key={option.key}
          onPress={() => onChange(option.key)}
          style={[styles.segment, active ? { backgroundColor: theme.primary } : null]}
        >
          <Ionicons name={option.icon} size={17} color={active ? "#FFFFFF" : theme.muted} />
          <Text style={[styles.segmentText, { color: active ? "#FFFFFF" : theme.muted }]}>
            {option.label}
          </Text>
        </Pressable>
      );
    })}
  </View>
);

/** Écran 1 — liste des salles avec recherche et filtre par capacité. */
const RoomListScreen = ({
  theme,
  lang,
  roomsQuery,
  rooms,
  search,
  onSearch,
  onSelectRoom,
}: {
  theme: SnowTheme;
  lang: Lang;
  roomsQuery: ReturnType<typeof useQuery<MeetingRoom[]>>;
  rooms: MeetingRoom[];
  search: string;
  onSearch: (value: string) => void;
  onSelectRoom: (room: MeetingRoom) => void;
}) => (
  <>
    <View style={[styles.search, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Ionicons name="search" size={19} color={theme.muted} />
      <TextInput
        value={search}
        onChangeText={onSearch}
        placeholder={arOrEn(lang, "ابحث عن قاعة أو موقع", "Search for a room or location")}
        placeholderTextColor={theme.muted}
        style={[styles.searchInput, { color: theme.text }]}
      />
      {search ? (
        <Pressable onPress={() => onSearch("")}>
          <Ionicons name="close-circle" size={18} color={theme.muted} />
        </Pressable>
      ) : null}
    </View>

    {roomsQuery.isLoading ? (
      <View style={styles.loadingSlot}>
        <Text style={[ui.small, { color: theme.muted }]}>
          {arOrEn(lang, "جاري التحميل...", "Loading...")}
        </Text>
      </View>
    ) : roomsQuery.isError ? (
      <Card theme={theme} style={styles.roomEmpty}>
        <Ionicons name="cloud-offline-outline" size={24} color={theme.danger} />
        <Text style={[ui.small, { color: theme.muted }]}>
          {arOrEn(lang, "تعذر تحميل القاعات", "Unable to load rooms")}
        </Text>
        <PrimaryButton
          label={arOrEn(lang, "إعادة المحاولة", "Retry")}
          icon="refresh"
          theme={theme}
          onPress={() => void roomsQuery.refetch()}
        />
      </Card>
    ) : rooms.length ? (
      <View style={{ gap: spacing.sm }}>
        {rooms.map((room) => (
          <RoomListCard
            key={room.id}
            theme={theme}
            lang={lang}
            room={room}
            onPress={() => onSelectRoom(room)}
          />
        ))}
      </View>
    ) : (
      <Card theme={theme} style={styles.roomEmpty}>
        <Ionicons name="search-outline" size={24} color={theme.muted} />
        <Text style={[ui.small, { color: theme.muted }]}>
          {arOrEn(lang, "لا توجد قاعة مطابقة", "No matching room")}
        </Text>
      </Card>
    )}
  </>
);

/**
 * Bloc texte rendu AVANT le visuel dans le JSX : sous RTL, le premier enfant
 * d'une ligne `row` se place au bord de départ (droite en arabe), donc ce
 * choix d'ordre place le texte à droite et la photo à gauche, comme la
 * maquette — sans jamais coder "left"/"right" en dur.
 */
const RoomListCard = ({
  theme,
  lang,
  room,
  onPress,
}: {
  theme: SnowTheme;
  lang: Lang;
  room: MeetingRoom;
  onPress: () => void;
}) => (
  <Pressable onPress={onPress}>
    <Card theme={theme} style={styles.roomListCard}>
      <View style={styles.roomChoiceText}>
        <Text numberOfLines={1} style={[styles.roomName, { color: theme.text }]}>
          {roomName(room, lang)}
        </Text>
        <View style={styles.inlineMeta}>
          <Ionicons name="people-outline" size={15} color={theme.muted} />
          <Text style={[ui.small, { color: theme.muted }]}>
            {room.capacity} {arOrEn(lang, "شخص", "people")}
          </Text>
        </View>
        <View style={styles.inlineMeta}>
          <View
            style={[
              styles.availableDot,
              { backgroundColor: room.active ? theme.success : theme.danger },
            ]}
          />
          <Text style={[ui.small, { color: room.active ? theme.success : theme.danger }]}>
            {room.active
              ? arOrEn(lang, "متاحة الآن", "Available now")
              : arOrEn(lang, "غير متاحة", "Unavailable")}
          </Text>
        </View>
      </View>
      <View style={styles.roomListVisual}>
        <Image
          source={require("../assets/meetingroom_icon.png")}
          resizeMode="contain"
          style={styles.roomListVisualImage}
        />
      </View>
    </Card>
  </Pressable>
);

/** Écran 2 — détail d'une salle : visuel, badge de disponibilité, infos, équipements. */
const RoomDetailScreen = ({
  theme,
  lang,
  room,
}: {
  theme: SnowTheme;
  lang: Lang;
  room: MeetingRoom;
}) => {
  const amenities = amenityKeys(room.amenities).map(resolveAmenity);
  return (
    <>
      <View style={styles.detailVisual}>
        <Image
          source={require("../assets/meetingroom_icon.png")}
          resizeMode="contain"
          style={styles.detailVisualImage}
        />
      </View>

      <View
        style={[
          styles.availabilityPill,
          { backgroundColor: `${room.active ? theme.success : theme.danger}18` },
        ]}
      >
        <Ionicons
          name={room.active ? "checkmark-circle" : "close-circle"}
          size={15}
          color={room.active ? theme.success : theme.danger}
        />
        <Text
          style={[
            styles.availabilityPillText,
            { color: room.active ? theme.success : theme.danger },
          ]}
        >
          {room.active
            ? arOrEn(lang, "متاحة الآن", "Available now")
            : arOrEn(lang, "غير متاحة", "Unavailable")}
        </Text>
      </View>
      <Text style={[ui.screenTitle, styles.detailName, { color: theme.text }]}>
        {roomName(room, lang)}
      </Text>

      <View style={[styles.statBoxRow, { borderColor: theme.border }]}>
        <StatBox
          theme={theme}
          value={`${room.capacity} ${arOrEn(lang, "شخص", "people")}`}
          label={arOrEn(lang, "السعة", "Capacity")}
        />
        <View style={[styles.statBoxDivider, { backgroundColor: theme.border }]} />
        <StatBox
          theme={theme}
          value={
            room.active
              ? arOrEn(lang, "متاحة", "Available")
              : arOrEn(lang, "غير متاحة", "Unavailable")
          }
          label={arOrEn(lang, "الحالة", "Status")}
        />
        <View style={[styles.statBoxDivider, { backgroundColor: theme.border }]} />
        <StatBox
          theme={theme}
          value={String(amenities.length)}
          label={arOrEn(lang, "المرافق", "Amenities")}
        />
      </View>

      {amenities.length ? (
        <>
          <SectionLabel theme={theme} label={arOrEn(lang, "المرافق", "Amenities")} />
          <View style={styles.amenityGrid}>
            {amenities.map((amenity) => (
              <View
                key={amenity.labelEn}
                style={[styles.amenityTile, { backgroundColor: theme.surfaceAlt }]}
              >
                <Ionicons name={amenity.icon} size={22} color={theme.text} />
                <Text numberOfLines={1} style={[styles.amenityLabel, { color: theme.text }]}>
                  {arOrEn(lang, amenity.labelAr, amenity.labelEn)}
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </>
  );
};

const StatBox = ({ theme, value, label }: { theme: SnowTheme; value: string; label: string }) => (
  <View style={styles.statBox}>
    <Text numberOfLines={1} style={[styles.statBoxValue, { color: theme.text }]}>
      {value}
    </Text>
    <Text style={[styles.statBoxLabel, { color: theme.muted }]}>{label}</Text>
  </View>
);

/** Écran 3 — formulaire : participants, date, période, créneau, remarques. */
const BookingFormScreen = ({
  theme,
  lang,
  room,
  rooms,
  participants,
  selectedDate,
  period,
  startMinutes,
  endMinutes,
  activeTimePicker,
  packages,
  packageId,
  notes,
  timeInvalid,
  onParticipantsChange,
  onSelectRoom,
  onSelectDate,
  onSelectPeriod,
  onSelectSlot,
  onOpenTimePicker,
  onNativeTimeChange,
  onWebTimeChange,
  onSelectPackage,
  onNotesChange,
}: {
  theme: SnowTheme;
  lang: Lang;
  room: MeetingRoom;
  rooms: MeetingRoom[];
  participants: number;
  selectedDate: Date;
  period: DayPeriod;
  startMinutes: number;
  endMinutes: number;
  activeTimePicker: "start" | "end" | null;
  packages: ServicePackage[];
  packageId: string | null;
  notes: string;
  timeInvalid: boolean;
  onParticipantsChange: (value: number) => void;
  onSelectRoom: (room: MeetingRoom) => void;
  onSelectDate: (date: Date) => void;
  onSelectPeriod: (period: DayPeriod) => void;
  onSelectSlot: (minutes: number) => void;
  onOpenTimePicker: (field: "start" | "end" | null) => void;
  onNativeTimeChange: (field: "start" | "end", event: DateTimePickerEvent, date?: Date) => void;
  onWebTimeChange: (field: "start" | "end", value: string) => void;
  onSelectPackage: (id: string | null) => void;
  onNotesChange: (value: string) => void;
}) => {
  const slots =
    period === "morning" ? [540, 570, 600, 630, 660, 690] : [840, 870, 900, 930, 960, 990];

  return (
    <>
      <Card theme={theme} style={styles.sectionCard}>
        <SectionLabel theme={theme} label={arOrEn(lang, "اختر قاعة", "Choose a room")} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.roomPickerRail}
        >
          {rooms
            .filter((item) => item.active)
            .map((item) => {
              const active = item.id === room.id;
              const amenities = amenityKeys(item.amenities).slice(0, 3).map(resolveAmenity);
              return (
                <Pressable
                  key={item.id}
                  onPress={() => onSelectRoom(item)}
                  style={[
                    styles.roomPickerCard,
                    {
                      borderColor: active ? theme.primaryStrong : theme.border,
                      backgroundColor: theme.surface,
                    },
                  ]}
                >
                  <View style={[styles.roomPickerImage, { backgroundColor: theme.primarySoft }]}>
                    <Image
                      source={require("../assets/meetingroom_icon.png")}
                      resizeMode="contain"
                      style={styles.roomPickerImageAsset}
                    />
                    {active ? (
                      <View
                        style={[styles.roomSelectedMark, { backgroundColor: theme.primaryStrong }]}
                      >
                        <Ionicons name="checkmark" size={17} color="#FFFFFF" />
                      </View>
                    ) : null}
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.roomPickerName,
                      { color: active ? theme.primaryStrong : theme.text },
                    ]}
                  >
                    {roomName(item, lang)}
                  </Text>
                  <Text style={[styles.roomPickerCapacity, { color: theme.muted }]}>
                    {arOrEn(
                      lang,
                      `السعة: ${item.capacity} أشخاص`,
                      `Capacity: ${item.capacity} people`,
                    )}
                  </Text>
                  <View style={styles.roomAmenityRow}>
                    {amenities.map((amenity) => (
                      <View key={amenity.labelEn} style={styles.roomAmenity}>
                        <Ionicons name={amenity.icon} size={17} color={theme.muted} />
                        <Text
                          numberOfLines={1}
                          style={[styles.roomAmenityText, { color: theme.muted }]}
                        >
                          {arOrEn(lang, amenity.labelAr, amenity.labelEn)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </Pressable>
              );
            })}
        </ScrollView>
      </Card>

      <Card theme={theme} style={styles.sectionCard}>
        <SectionLabel theme={theme} label={arOrEn(lang, "التاريخ والوقت", "Date and time")} />
        <DateRail theme={theme} lang={lang} selected={selectedDate} onSelect={onSelectDate} />
        <View style={styles.timeRow}>
          <TimeField
            theme={theme}
            lang={lang}
            label={arOrEn(lang, "من", "From")}
            minutes={startMinutes}
            active={activeTimePicker === "start"}
            onPress={() => onOpenTimePicker("start")}
            onNativeChange={(event, date) => onNativeTimeChange("start", event, date)}
            onWebChange={(value) => onWebTimeChange("start", value)}
          />
          <TimeField
            theme={theme}
            lang={lang}
            label={arOrEn(lang, "إلى", "To")}
            minutes={endMinutes}
            active={activeTimePicker === "end"}
            onPress={() => onOpenTimePicker("end")}
            onNativeChange={(event, date) => onNativeTimeChange("end", event, date)}
            onWebChange={(value) => onWebTimeChange("end", value)}
          />
        </View>
        {Platform.OS === "android" && activeTimePicker ? (
          <DateTimePicker
            value={minutesToDate(
              selectedDate,
              activeTimePicker === "end" ? endMinutes : startMinutes,
            )}
            mode="time"
            display="default"
            is24Hour
            minuteInterval={MINUTE_STEP}
            onChange={(event, date) => onNativeTimeChange(activeTimePicker, event, date)}
          />
        ) : null}
        {timeInvalid ? (
          <Text style={[ui.errorText, { color: theme.danger }]}>
            {arOrEn(
              lang,
              "وقت النهاية يجب أن يكون بعد وقت البداية",
              "End time must be after start time",
            )}
          </Text>
        ) : null}
        <View style={[styles.durationBanner, { backgroundColor: theme.primarySoft }]}>
          <Ionicons name="time-outline" size={19} color={theme.primaryStrong} />
          <Text style={[styles.durationText, { color: theme.primaryStrong }]}>
            {arOrEn(lang, "المدة", "Duration")}: {Math.floor((endMinutes - startMinutes) / 60)}h
            {String((endMinutes - startMinutes) % 60).padStart(2, "0")}
          </Text>
        </View>
      </Card>

      {packages.length ? (
        <Card theme={theme} style={styles.sectionCard}>
          <SectionLabel
            theme={theme}
            label={arOrEn(lang, "الخدمات المتاحة", "Available services")}
          />
          <View style={styles.packageGrid}>
            {packages.map((item) => (
              <PackageChip
                key={item.id}
                theme={theme}
                label={
                  (lang === "ar" ? item.nameAr : item.nameEn || item.nameAr) ||
                  packageTypeLabel(item.type, lang)
                }
                active={packageId === item.id}
                onPress={() => onSelectPackage(item.id)}
              />
            ))}
          </View>
        </Card>
      ) : null}

      <Card theme={theme} style={styles.sectionCard}>
        <SectionLabel
          theme={theme}
          label={arOrEn(lang, "عدد المشاركين", "Number of participants")}
        />
        <View style={styles.participantsCentered}>
          <Stepper
            theme={theme}
            quantity={participants}
            onAdd={() => onParticipantsChange(Math.min(participants + 1, room.capacity))}
            onRemove={() => onParticipantsChange(Math.max(1, participants - 1))}
          />
          <Text style={[styles.participantsHint, { color: theme.muted }]}>
            {arOrEn(
              lang,
              `سعة القاعة المحددة: ${room.capacity} أشخاص`,
              `Selected room capacity: ${room.capacity} people`,
            )}
          </Text>
        </View>
      </Card>

      <Card theme={theme} style={styles.sectionCard}>
        <SectionLabel theme={theme} label={arOrEn(lang, "ملاحظات (اختياري)", "Notes (optional)")} />
        <TextInput
          value={notes}
          onChangeText={onNotesChange}
          maxLength={300}
          placeholder={arOrEn(
            lang,
            "أضف أي ملاحظات خاصة بالاجتماع",
            "Add any notes specific to your meeting",
          )}
          placeholderTextColor={theme.muted}
          multiline
          style={[
            styles.notesInput,
            { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface },
          ]}
        />
        <Text style={[styles.notesCount, { color: theme.muted }]}>{notes.length} / 300</Text>
      </Card>
    </>
  );
};

/** Écran 5 — confirmation avec récapitulatif de la réservation créée (les CTA vivent dans le footer épinglé). */
const ConfirmationScreen = ({
  theme,
  lang,
  room,
  booking,
  participants,
  period,
}: {
  theme: SnowTheme;
  lang: Lang;
  room: MeetingRoom;
  booking: RoomBooking;
  participants: number;
  period: DayPeriod;
}) => (
  <View style={styles.confirmationRoot}>
    <View style={styles.successIconWrap}>
      <ConfettiDots theme={theme} />
      <View style={[styles.successIcon, { backgroundColor: theme.primarySoft }]}>
        <Ionicons name="checkmark" size={48} color={theme.primaryStrong} />
      </View>
    </View>
    <Text style={[ui.screenTitle, styles.confirmationTitle, { color: theme.text }]}>
      {arOrEn(lang, "تم حجز قاعة الاجتماع بنجاح", "Meeting room booked successfully")}
    </Text>
    <Text style={[ui.small, styles.confirmationSubtitle, { color: theme.muted }]}>
      {arOrEn(
        lang,
        "تم تأكيد حجزك، تنتظرك القاعة في الموعد المحدد",
        "Your booking is confirmed — see you at the scheduled time",
      )}
    </Text>

    <Card theme={theme} style={styles.confirmationCard}>
      <Text numberOfLines={1} style={[styles.confirmationRoomName, { color: theme.text }]}>
        {roomName(room, lang)}
      </Text>
      <SummaryRow
        theme={theme}
        icon="calendar-outline"
        label={arOrEn(lang, "التاريخ", "Date")}
        value={formatBookingDate(booking.startTime, lang)}
      />
      <SummaryRow
        theme={theme}
        icon="time-outline"
        label={arOrEn(lang, "الوقت", "Time")}
        value={`${formatBookingTime(booking.startTime, lang)} – ${formatBookingTime(booking.endTime, lang)}`}
      />
      <SummaryRow
        theme={theme}
        icon={period === "morning" ? "sunny-outline" : "moon-outline"}
        label={arOrEn(lang, "فترة الاجتماع", "Meeting period")}
        value={
          period === "morning"
            ? arOrEn(lang, "صباحاً", "Morning")
            : arOrEn(lang, "مساءً", "Evening")
        }
      />
      <SummaryRow
        theme={theme}
        icon="people-outline"
        label={arOrEn(lang, "عدد الحضور", "Attendees")}
        value={String(participants)}
      />
      <SummaryRow
        theme={theme}
        icon="copy-outline"
        label={arOrEn(lang, "رقم الحجز", "Booking number")}
        value={`#${booking.id.slice(0, 8).toUpperCase()}`}
        copyValue={`#${booking.id.slice(0, 8).toUpperCase()}`}
      />
    </Card>
  </View>
);

/** Détail d'une réservation sélectionnée depuis « حجوزاتي ». */
const BookingDetailScreen = ({
  theme,
  lang,
  booking,
  room,
}: {
  theme: SnowTheme;
  lang: Lang;
  booking: RoomBooking;
  room?: MeetingRoom;
}) => {
  const past = new Date(booking.endTime).getTime() < Date.now();
  const cancelled = booking.status === "CANCELLED";
  const statusColor = cancelled ? theme.danger : past ? theme.muted : theme.success;
  const status = cancelled
    ? arOrEn(lang, "ملغي", "Cancelled")
    : past
      ? arOrEn(lang, "منتهي", "Completed")
      : arOrEn(lang, "مؤكد", "Confirmed");
  const durationMinutes = Math.max(
    0,
    Math.round(
      (new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime()) / 60_000,
    ),
  );
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  const duration = [
    hours ? `${hours} ${arOrEn(lang, "ساعة", hours === 1 ? "hour" : "hours")}` : "",
    minutes ? `${minutes} ${arOrEn(lang, "دقيقة", "min")}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const packageName =
    (lang === "ar" ? booking.services?.packageNameAr : booking.services?.packageNameEn) ??
    booking.services?.packageNameAr ??
    arOrEn(lang, "بدون خدمة إضافية", "No additional service");
  const roomLabel = room ? roomName(room, lang) : `#${booking.roomId.slice(0, 8).toUpperCase()}`;

  return (
    <View style={styles.bookingDetailRoot}>
      <Card theme={theme} style={styles.bookingDetailHero}>
        <View style={[styles.bookingDetailIcon, { backgroundColor: theme.primarySoft }]}>
          <Ionicons name="calendar-outline" size={34} color={theme.primaryStrong} />
        </View>
        <Text numberOfLines={2} style={[styles.bookingDetailRoom, { color: theme.text }]}>
          {roomLabel}
        </Text>
        <View
          style={[ui.badge, styles.bookingDetailStatus, { backgroundColor: `${statusColor}16` }]}
        >
          <Ionicons
            name={cancelled ? "close-circle" : past ? "checkmark-circle" : "calendar"}
            size={16}
            color={statusColor}
          />
          <Text style={[ui.badgeText, { color: statusColor }]}>{status}</Text>
        </View>
      </Card>

      <Card theme={theme} style={styles.bookingDetailCard}>
        <Text style={[styles.bookingDetailSectionTitle, { color: theme.text }]}>
          {arOrEn(lang, "موعد الحجز", "Booking schedule")}
        </Text>
        <SummaryRow
          theme={theme}
          icon="calendar-outline"
          label={arOrEn(lang, "التاريخ", "Date")}
          value={formatBookingDate(booking.startTime, lang)}
        />
        <SummaryRow
          theme={theme}
          icon="time-outline"
          label={arOrEn(lang, "الوقت", "Time")}
          value={`${formatBookingTime(booking.startTime, lang)} – ${formatBookingTime(booking.endTime, lang)}`}
        />
        <SummaryRow
          theme={theme}
          icon="hourglass-outline"
          label={arOrEn(lang, "المدة", "Duration")}
          value={duration || "—"}
        />
      </Card>

      <Card theme={theme} style={styles.bookingDetailCard}>
        <Text style={[styles.bookingDetailSectionTitle, { color: theme.text }]}>
          {arOrEn(lang, "معلومات الحجز", "Booking information")}
        </Text>
        {room ? (
          <SummaryRow
            theme={theme}
            icon="people-outline"
            label={arOrEn(lang, "سعة القاعة", "Room capacity")}
            value={`${room.capacity} ${arOrEn(lang, "شخص", "people")}`}
          />
        ) : null}
        <SummaryRow
          theme={theme}
          icon="cafe-outline"
          label={arOrEn(lang, "الخدمة", "Service")}
          value={packageName}
        />
        <SummaryRow
          theme={theme}
          icon="key-outline"
          label={arOrEn(lang, "رقم الحجز", "Booking number")}
          value={`#${booking.id.slice(0, 8).toUpperCase()}`}
          copyValue={`#${booking.id.slice(0, 8).toUpperCase()}`}
        />
        <SummaryRow
          theme={theme}
          icon="calendar-number-outline"
          label={arOrEn(lang, "تاريخ الإنشاء", "Created")}
          value={formatBookingDate(booking.createdAt, lang)}
        />
      </Card>
    </View>
  );
};

const DateRail = ({
  theme,
  lang,
  selected,
  onSelect,
}: {
  theme: SnowTheme;
  lang: Lang;
  selected: Date;
  onSelect: (date: Date) => void;
}) => {
  const [weekOffset, setWeekOffset] = useState(0);
  const today = startOfDay(new Date());
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const visibleWeekStart = new Date(weekStart);
  visibleWeekStart.setDate(weekStart.getDate() + weekOffset * 7);
  const week = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(visibleWeekStart);
    day.setDate(visibleWeekStart.getDate() + index);
    return day;
  });
  const weekday = new Intl.DateTimeFormat(lang === "ar" ? "ar" : "en", { weekday: "short" });
  const month = new Intl.DateTimeFormat(lang === "ar" ? "ar" : "en", { month: "short" });
  const rangeFormatter = new Intl.DateTimeFormat(lang === "ar" ? "ar" : "en", {
    day: "numeric",
    month: "long",
  });
  const weekLabel = `${rangeFormatter.format(week[0])} – ${rangeFormatter.format(week[6])}`;

  return (
    <View style={styles.weekCarousel}>
      <View style={styles.weekCarouselHeader}>
        <Pressable
          disabled={weekOffset === 0}
          onPress={() => setWeekOffset((current) => Math.max(0, current - 1))}
          style={[
            styles.weekArrow,
            { backgroundColor: theme.surfaceAlt, opacity: weekOffset === 0 ? 0.35 : 1 },
          ]}
        >
          <Ionicons name={directionalIcon("chevron-back")} size={18} color={theme.text} />
        </Pressable>
        <View style={styles.weekTitleBlock}>
          <Text style={[styles.weekTitle, { color: theme.text }]}>
            {weekOffset === 0
              ? arOrEn(lang, "هذا الأسبوع", "This week")
              : arOrEn(lang, `الأسبوع ${weekOffset + 1}`, `Week ${weekOffset + 1}`)}
          </Text>
          <Text style={[styles.weekLabel, { color: theme.muted }]}>{weekLabel}</Text>
        </View>
        <Pressable
          onPress={() => setWeekOffset((current) => current + 1)}
          style={[styles.weekArrow, { backgroundColor: theme.surfaceAlt }]}
        >
          <Ionicons name={directionalIcon("chevron-forward")} size={18} color={theme.text} />
        </Pressable>
      </View>
      <View style={styles.dateRail}>
        {week.map((day) => {
          const active = day.getTime() === selected.getTime();
          const disabled = day.getTime() < today.getTime();
          return (
            <Pressable
              key={day.toISOString()}
              disabled={disabled}
              onPress={() => onSelect(day)}
              style={[
                styles.dateTile,
                {
                  backgroundColor: active ? theme.primarySoft : theme.surface,
                  borderColor: active ? theme.primary : theme.border,
                  opacity: disabled ? 0.4 : 1,
                },
              ]}
            >
              <Text
                style={[styles.dateWeekday, { color: active ? theme.primaryStrong : theme.muted }]}
              >
                {weekday.format(day)}
              </Text>
              <Text style={[styles.dateDay, { color: active ? theme.primaryStrong : theme.text }]}>
                {day.getDate()}
              </Text>
              <Text
                style={[styles.dateMonth, { color: active ? theme.primaryStrong : theme.muted }]}
              >
                {month.format(day)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.weekDots}>
        {[0, 1, 2].map((item) => (
          <View
            key={item}
            style={[
              styles.weekDot,
              { backgroundColor: Math.min(weekOffset, 2) === item ? theme.primary : theme.border },
            ]}
          />
        ))}
      </View>
    </View>
  );
};

/** Écran 4 — mes réservations (à venir / passées). */
const BookingsView = ({
  theme,
  lang,
  query,
  bookings,
  roomsById,
  search,
  period,
  onSearch,
  onPeriodChange,
  onViewDetails,
  onCancel,
  onBookAgain,
  onGoToRooms,
}: {
  theme: SnowTheme;
  lang: Lang;
  query: ReturnType<typeof useQuery<RoomBooking[]>>;
  bookings: RoomBooking[];
  roomsById: Map<string, MeetingRoom>;
  search: string;
  period: "upcoming" | "past";
  onSearch: (value: string) => void;
  onPeriodChange: (period: "upcoming" | "past") => void;
  onViewDetails: (booking: RoomBooking) => void;
  onCancel: (id: string) => void;
  onBookAgain: (booking: RoomBooking) => void;
  onGoToRooms: () => void;
}) => (
  <>
    <SegmentedControl
      theme={theme}
      options={[
        { key: "upcoming", label: arOrEn(lang, "القادمة", "Upcoming"), icon: "calendar-outline" },
        { key: "past", label: arOrEn(lang, "السابقة", "Past"), icon: "time-outline" },
      ]}
      value={period}
      onChange={(value) => onPeriodChange(value as "upcoming" | "past")}
    />
    <View style={[styles.search, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Ionicons name="search" size={19} color={theme.muted} />
      <TextInput
        value={search}
        onChangeText={onSearch}
        placeholder={arOrEn(lang, "البحث في حجوزاتي", "Search my bookings")}
        placeholderTextColor={theme.muted}
        style={[styles.searchInput, { color: theme.text }]}
      />
      {search ? (
        <Pressable onPress={() => onSearch("")}>
          <Ionicons name="close-circle" size={18} color={theme.muted} />
        </Pressable>
      ) : null}
    </View>
    {query.isLoading ? (
      <View style={styles.loadingSlot}>
        <Text style={[ui.small, { color: theme.muted }]}>
          {arOrEn(lang, "جاري التحميل...", "Loading...")}
        </Text>
      </View>
    ) : query.isError ? (
      <Card theme={theme} style={styles.roomEmpty}>
        <Ionicons name="cloud-offline-outline" size={24} color={theme.danger} />
        <Text style={[ui.small, { color: theme.muted }]}>
          {arOrEn(lang, "تعذر تحميل الحجوزات", "Unable to load bookings")}
        </Text>
        <PrimaryButton
          label={arOrEn(lang, "إعادة المحاولة", "Retry")}
          icon="refresh"
          theme={theme}
          onPress={() => void query.refetch()}
        />
      </Card>
    ) : bookings.length ? (
      bookings.map((booking) => {
        const room = roomsById.get(booking.roomId);
        const name = room ? roomName(room, lang) : `#${booking.roomId.slice(0, 8)}`;
        return (
          <BookingCard
            key={booking.id}
            theme={theme}
            lang={lang}
            booking={booking}
            room={room}
            roomNameLabel={name}
            onViewDetails={() => onViewDetails(booking)}
            onCancel={() => onCancel(booking.id)}
            onBookAgain={() => onBookAgain(booking)}
          />
        );
      })
    ) : (
      <BookingsEmpty theme={theme} lang={lang} onGoToRooms={onGoToRooms} />
    )}
  </>
);

// ponytail: même traitement que les autres états vides (Favoris/Panier/Commandes) —
// pas de carte, image posée directement sur l'écran, bouton pilule épinglé en bas.
const BookingsEmpty = ({
  theme,
  lang,
  onGoToRooms,
}: {
  theme: SnowTheme;
  lang: Lang;
  onGoToRooms: () => void;
}) => (
  <View style={styles.bookingsEmptyRoot}>
    <View style={styles.bookingsEmptyContent}>
      <Image
        source={require("../assets/meeting_icon.png")}
        resizeMode="contain"
        style={styles.bookingsEmptyImage}
      />
      <Text style={[ui.screenTitle, { color: theme.text }]}>
        {arOrEn(lang, "لا توجد حجوزات", "No bookings found")}
      </Text>
      <Text style={[ui.small, styles.bookingsEmptyText, { color: theme.muted }]}>
        {arOrEn(
          lang,
          "احجز قاعة اجتماعات وستظهر هنا",
          "Book a meeting room and it will show up here",
        )}
      </Text>
    </View>
    <PrimaryButton
      label={arOrEn(lang, "حجز قاعة", "Book a room")}
      pill
      theme={theme}
      onPress={onGoToRooms}
    />
  </View>
);

const BookingCard = ({
  theme,
  lang,
  booking,
  room,
  roomNameLabel,
  onViewDetails,
  onCancel,
  onBookAgain,
}: {
  theme: SnowTheme;
  lang: Lang;
  booking: RoomBooking;
  room?: MeetingRoom;
  roomNameLabel: string;
  onViewDetails: () => void;
  onCancel: () => void;
  onBookAgain: () => void;
}) => {
  const past = new Date(booking.endTime).getTime() < Date.now();
  const cancelled = booking.status === "CANCELLED";
  const statusColor = cancelled ? theme.danger : past ? theme.muted : theme.success;
  const status = cancelled
    ? arOrEn(lang, "ملغي", "Cancelled")
    : past
      ? arOrEn(lang, "منتهي", "Completed")
      : arOrEn(lang, "مؤكد", "Confirmed");
  const packageName =
    lang === "ar"
      ? booking.services?.packageNameAr
      : booking.services?.packageNameEn || booking.services?.packageNameAr;

  return (
    <Card theme={theme} style={styles.bookingCard}>
      <View style={styles.bookingTop}>
        <View style={styles.bookingVisual}>
          <Image
            source={require("../assets/meeting_icon.png")}
            resizeMode="contain"
            style={styles.bookingVisualImage}
          />
        </View>
        <View style={ui.rowInfo}>
          <View style={styles.bookingTitleRow}>
            <Text numberOfLines={1} style={[styles.bookingTitle, { color: theme.text }]}>
              {roomNameLabel}
            </Text>
            <View style={[ui.badge, { backgroundColor: `${statusColor}16` }]}>
              <Text style={[ui.badgeText, { color: statusColor }]}>{status}</Text>
            </View>
          </View>
          <MetaLine
            theme={theme}
            icon="calendar-outline"
            text={formatBookingDate(booking.startTime, lang)}
          />
          <MetaLine
            theme={theme}
            icon="time-outline"
            text={`${formatBookingTime(booking.startTime, lang)} – ${formatBookingTime(booking.endTime, lang)}`}
          />
          {room ? (
            <MetaLine
              theme={theme}
              icon="people-outline"
              text={`${room.capacity} ${arOrEn(lang, "شخص", "people")}`}
            />
          ) : null}
          {packageName ? <MetaLine theme={theme} icon="cafe-outline" text={packageName} /> : null}
        </View>
      </View>
      <View style={[styles.bookingActions, { borderTopColor: theme.border }]}>
        <Pressable onPress={onViewDetails} style={styles.detailAction}>
          <Text style={[styles.actionText, { color: theme.primaryStrong }]}>
            {arOrEn(lang, "عرض التفاصيل", "View details")}
          </Text>
          <Ionicons name={directionalIcon("chevron-forward")} size={17} color={theme.muted} />
        </Pressable>
        {past || cancelled ? (
          <Pressable
            onPress={onBookAgain}
            style={[styles.outlineAction, { borderColor: theme.primary }]}
          >
            <Ionicons name="refresh-outline" size={17} color={theme.muted} />
            <Text style={[styles.actionText, { color: theme.primaryStrong }]}>
              {arOrEn(lang, "إعادة الحجز", "Book again")}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={onCancel}
            style={[styles.outlineAction, { borderColor: `${theme.danger}55` }]}
          >
            <Ionicons name="trash-outline" size={17} color={theme.danger} />
            <Text style={[styles.actionText, { color: theme.danger }]}>
              {arOrEn(lang, "إلغاء الحجز", "Cancel")}
            </Text>
          </Pressable>
        )}
      </View>
    </Card>
  );
};

const MetaLine = ({
  theme,
  icon,
  text,
}: {
  theme: SnowTheme;
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) => (
  <View style={styles.inlineMeta}>
    <Ionicons name={icon} size={16} color={theme.muted} />
    <Text numberOfLines={1} style={[ui.small, { color: theme.muted }]}>
      {text}
    </Text>
  </View>
);

const SectionLabel = ({ theme, label }: { theme: SnowTheme; label: string }) => (
  <Text style={[styles.sectionLabel, { color: theme.text }]}>{label}</Text>
);

const PackageChip = ({
  theme,
  label,
  active,
  onPress,
}: {
  theme: SnowTheme;
  label: string;
  active: boolean;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    style={[
      styles.packageChip,
      {
        backgroundColor: active ? theme.primarySoft : theme.surface,
        borderColor: active ? theme.primary : theme.border,
      },
    ]}
  >
    <Ionicons
      name={active ? "checkmark-circle-outline" : "restaurant-outline"}
      size={17}
      color={theme.muted}
    />
    <Text
      numberOfLines={1}
      style={[styles.packageText, { color: active ? theme.primaryStrong : theme.text }]}
    >
      {label}
    </Text>
  </Pressable>
);

const TimeField = ({
  theme,
  lang,
  label,
  minutes,
  active,
  onPress,
  onNativeChange,
  onWebChange,
}: {
  theme: SnowTheme;
  lang: Lang;
  label: string;
  minutes: number;
  active: boolean;
  onPress: () => void;
  onNativeChange: (event: DateTimePickerEvent, date?: Date) => void;
  onWebChange: (value: string) => void;
}) => {
  const content = (
    <View
      style={[
        styles.timeField,
        {
          borderColor: active ? theme.primary : theme.border,
          backgroundColor: active ? theme.primarySoft : theme.surface,
        },
      ]}
    >
      <Text style={[ui.small, { color: theme.muted }]}>{label}</Text>
      {Platform.OS === "web" ? (
        <WebTimeInput theme={theme} value={formatMinutes(minutes)} onChange={onWebChange} />
      ) : Platform.OS === "ios" ? (
        <DateTimePicker
          value={minutesToDate(new Date(), minutes)}
          mode="time"
          display="compact"
          minuteInterval={MINUTE_STEP}
          locale={lang === "ar" ? "ar" : "en"}
          onChange={onNativeChange}
          style={styles.compactTimePicker}
        />
      ) : (
        <View style={styles.timeControls}>
          <Ionicons name="time-outline" size={18} color={theme.muted} />
          <Text style={[styles.timeValue, { color: theme.text }]}>{formatMinutes(minutes)}</Text>
        </View>
      )}
    </View>
  );
  return Platform.OS === "android" ? (
    <Pressable onPress={onPress} style={styles.timeFieldPressable}>
      {content}
    </Pressable>
  ) : (
    <View style={styles.timeFieldPressable}>{content}</View>
  );
};

const WebTimeInput = ({
  theme,
  value,
  onChange,
}: {
  theme: SnowTheme;
  value: string;
  onChange: (value: string) => void;
}) =>
  React.createElement("input", {
    type: "time",
    value,
    step: MINUTE_STEP * 60,
    onChange: (event: { currentTarget: { value: string } }) => onChange(event.currentTarget.value),
    style: {
      width: "100%",
      minHeight: 32,
      border: 0,
      padding: 0,
      backgroundColor: "transparent",
      color: theme.text,
      fontSize: 18,
      fontWeight: 700,
      textAlign: "center",
      outline: "none",
    },
  });

const styles = createSnowStyles({
  root: { flex: 1 },
  header: {
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  headerButton: {
    width: 92,
    height: 44,
    borderWidth: 0,
    borderRadius: 10,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  bookingsHeaderAction: {
    minHeight: 44,
    minWidth: 92,
    alignItems: "center",
    justifyContent: "center",
  },
  bookingsHeaderText: { fontSize: 13, fontWeight: "600" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 20, fontWeight: "700" },
  content: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  footer: { padding: spacing.lg, borderTopWidth: 1 },
  segmented: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 10,
    padding: 3,
    flexDirection: "row",
    alignItems: "center",
  },
  segment: {
    flex: 1,
    minHeight: 40,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  segmentText: { fontSize: 13, fontWeight: "600" },
  sectionLabel: { fontSize: 16, fontWeight: "700" },
  loadingSlot: { minHeight: 88, alignItems: "center", justifyContent: "center" },
  availableDot: { width: 7, height: 7, borderRadius: 4 },
  roomEmpty: { minHeight: 88, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  bookingsEmptyRoot: { flex: 1, minHeight: 360, justifyContent: "space-between", gap: spacing.xl },
  bookingsEmptyContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  bookingsEmptyImage: { width: 220, height: 220 },
  bookingsEmptyText: { textAlign: "center" },
  roomListCard: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  roomListVisual: { width: 72, height: 72, alignItems: "center", justifyContent: "center" },
  roomListVisualImage: { width: 60, height: 60 },
  roomChoiceText: { flex: 1, gap: spacing.sm },
  roomName: { fontSize: 15, fontWeight: "700" },
  inlineMeta: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  sectionCard: { gap: spacing.md, borderRadius: 20, padding: spacing.lg },
  roomPickerRail: { gap: spacing.md, paddingEnd: spacing.sm },
  roomPickerCard: {
    width: 220,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  roomPickerImage: {
    width: "100%",
    height: 116,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  roomPickerImageAsset: { width: "88%", height: "88%" },
  roomSelectedMark: {
    position: "absolute",
    top: spacing.sm,
    end: spacing.sm,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  roomPickerName: { fontSize: 15, fontWeight: "700", textAlign: "center" },
  roomPickerCapacity: { fontSize: 12, fontWeight: "400", textAlign: "center" },
  roomAmenityRow: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    gap: spacing.xs,
  },
  roomAmenity: { flex: 1, alignItems: "center", gap: 2 },
  roomAmenityText: { fontSize: 8, fontWeight: "500", textAlign: "center" },
  detailVisual: { minHeight: 200, alignItems: "center", justifyContent: "center" },
  detailVisualImage: { width: 160, height: 160 },
  detailName: { textAlign: "center" },
  availabilityPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  availabilityPillText: { fontSize: 12, fontWeight: "700" },
  statBoxRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: spacing.md,
  },
  statBox: { flex: 1, alignItems: "center", gap: 4 },
  statBoxDivider: { width: 1, alignSelf: "stretch" },
  statBoxValue: { fontSize: 13, fontWeight: "700" },
  statBoxLabel: { fontSize: 11, fontWeight: "500" },
  amenityGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  amenityTile: {
    width: "31%",
    minHeight: 76,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    padding: spacing.sm,
  },
  amenityLabel: { fontSize: 11, fontWeight: "600", textAlign: "center" },
  participantsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  participantsCentered: { alignItems: "center", gap: spacing.md },
  participantsHint: { fontSize: 12, fontWeight: "500", textAlign: "center" },
  durationBanner: {
    minHeight: 48,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  durationText: { fontSize: 13, fontWeight: "600" },
  notesInput: {
    minHeight: 88,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: 13,
    fontWeight: "400",
    textAlignVertical: "top",
  },
  notesCount: { alignSelf: "flex-end", fontSize: 11, fontWeight: "400" },
  weekCarousel: { gap: spacing.md },
  weekCarouselHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  weekArrow: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  weekTitleBlock: { flex: 1, alignItems: "center", gap: 2 },
  weekTitle: { fontSize: 13, fontWeight: "700" },
  weekLabel: { fontSize: 11, fontWeight: "600" },
  dateRail: { flexDirection: "row", gap: spacing.xs },
  dateTile: {
    flex: 1,
    minWidth: 0,
    minHeight: 76,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingHorizontal: 2,
  },
  dateWeekday: { fontSize: 9, fontWeight: "600" },
  dateDay: { fontSize: 16, fontWeight: "700" },
  dateMonth: { fontSize: 9, fontWeight: "500" },
  weekDots: { flexDirection: "row", justifyContent: "center", gap: spacing.xs },
  weekDot: { width: 6, height: 6, borderRadius: 3 },
  slotGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  slot: {
    width: "31.5%",
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  slotText: { fontSize: 14, fontWeight: "600" },
  timeRow: { flexDirection: "row", gap: spacing.md },
  timeFieldPressable: { flex: 1 },
  timeField: {
    flex: 1,
    minHeight: 68,
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  timeControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  timeValue: { minWidth: 64, textAlign: "center", fontSize: 18, fontWeight: "700" },
  compactTimePicker: { minHeight: 32 },
  packageGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  packageChip: {
    width: "48.5%",
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  packageText: { flex: 1, fontSize: 12, fontWeight: "600" },
  search: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: "400", paddingVertical: 0 },
  bookingDetailRoot: { gap: spacing.md },
  bookingDetailHero: { alignItems: "center", gap: spacing.md, paddingVertical: spacing.xl },
  bookingDetailIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  bookingDetailRoom: { fontSize: 22, lineHeight: 28, fontWeight: "700", textAlign: "center" },
  bookingDetailStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  bookingDetailCard: { borderRadius: 20, padding: spacing.lg, gap: spacing.md },
  bookingDetailSectionTitle: { fontSize: 17, lineHeight: 24, fontWeight: "700" },
  bookingCard: { gap: spacing.md, padding: spacing.md },
  bookingTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  bookingVisual: {
    width: 82,
    minHeight: 82,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  bookingVisualImage: { width: 72, height: 72 },
  bookingTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  bookingTitle: { flex: 1, fontSize: 15, fontWeight: "700" },
  bookingActions: {
    borderTopWidth: 1,
    paddingTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  detailAction: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: spacing.xs },
  outlineAction: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  actionText: { fontSize: 12, fontWeight: "600" },
  confirmationRoot: { alignItems: "center", gap: spacing.lg },
  successIconWrap: { width: 108, height: 108, alignItems: "center", justifyContent: "center" },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmationTitle: { textAlign: "center" },
  confirmationSubtitle: { textAlign: "center" },
  confirmationCard: { width: "100%", gap: spacing.md },
  confirmationRoomName: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  confirmButton: {
    width: "100%",
    minHeight: 50,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  confirmButtonOutline: {
    width: "100%",
    minHeight: 50,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonOutlineText: { fontSize: 15, fontWeight: "700" },
});
