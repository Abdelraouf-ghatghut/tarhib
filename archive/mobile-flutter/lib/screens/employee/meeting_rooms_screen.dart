import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../api/api_client.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/snow_colors.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/error_card.dart';
import '../../widgets/glass_app_bar.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/status_badge.dart';
import '../../widgets/tarhib_scaffold.dart';

// ── DTOs (kept local, no generated client needed) ─────────────────────────────

class _Room {
  final String id;
  final String name;
  final int capacity;
  final bool available;

  const _Room({
    required this.id,
    required this.name,
    required this.capacity,
    required this.available,
  });

  factory _Room.fromJson(Map<String, dynamic> j) => _Room(
        id: j['id'] as String? ?? '',
        name: j['name']?.toString() ?? '',
        capacity: (j['capacity'] as num?)?.round() ?? 0,
        available: j['available'] as bool? ?? true,
      );
}

class _Booking {
  final String id;
  final String roomName;
  final DateTime start;
  final DateTime end;
  final String status;

  const _Booking({
    required this.id,
    required this.roomName,
    required this.start,
    required this.end,
    required this.status,
  });

  factory _Booking.fromJson(Map<String, dynamic> j) {
    return _Booking(
      id: j['id']?.toString() ?? '',
      roomName: j['room']?['name']?.toString() ??
          j['roomName']?.toString() ?? '',
      start: DateTime.tryParse(j['startTime']?.toString() ?? '') ??
          DateTime.now(),
      end: DateTime.tryParse(j['endTime']?.toString() ?? '') ??
          DateTime.now().add(const Duration(hours: 1)),
      status: j['status']?.toString() ?? '',
    );
  }
}

// ── Providers ─────────────────────────────────────────────────────────────────

final _roomsProvider = FutureProvider.autoDispose<List<_Room>>((ref) async {
  final resp = await ApiClient.rawDio.get<Map<String, dynamic>>('/meeting-rooms');
  final raw = resp.data?['data'] ?? resp.data?['items'] ?? resp.data ?? [];
  return (raw as List).map((e) => _Room.fromJson(e as Map<String, dynamic>)).toList();
});

final _myBookingsProvider = FutureProvider.autoDispose<List<_Booking>>((ref) async {
  final resp = await ApiClient.rawDio.get<Map<String, dynamic>>('/meeting-rooms/bookings/me');
  final raw = resp.data?['data'] ?? resp.data?['items'] ?? resp.data ?? [];
  return (raw as List).map((e) => _Booking.fromJson(e as Map<String, dynamic>)).toList();
});

// ── Screen ────────────────────────────────────────────────────────────────────

/// TARHIB-35 — Réservation de salles de réunion
class MeetingRoomsScreen extends ConsumerStatefulWidget {
  const MeetingRoomsScreen({super.key});

  @override
  ConsumerState<MeetingRoomsScreen> createState() => _MeetingRoomsScreenState();
}

class _MeetingRoomsScreenState extends ConsumerState<MeetingRoomsScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final scheme = Theme.of(context).colorScheme;

    return TarhibScaffold(
      appBar: GlassAppBar(
        title: Text(l.meetingRooms,
            style: const TextStyle(fontWeight: FontWeight.bold)),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          onPressed: () =>
              context.canPop() ? context.pop() : context.go('/employee/home'),
        ),
        bottom: TabBar(
          controller: _tabs,
          indicatorColor: scheme.primary,
          labelColor: scheme.primary,
          unselectedLabelColor: scheme.onSurface.withValues(alpha: 0.5),
          tabs: [
            Tab(text: l.available),
            Tab(text: l.myBookings),
          ],
        ),
      ),
      child: TabBarView(
        controller: _tabs,
        children: [
          _RoomsTab(l: l),
          _MyBookingsTab(l: l),
        ],
      ),
    );
  }
}

// ── Rooms tab ─────────────────────────────────────────────────────────────────

class _RoomsTab extends ConsumerWidget {
  const _RoomsTab({required this.l});
  final AppLocalizations l;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final roomsAsync = ref.watch(_roomsProvider);

    return RefreshIndicator(
      onRefresh: () async => ref.invalidate(_roomsProvider),
      child: roomsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: ErrorCard(
            error: e,
            onRetry: () => ref.invalidate(_roomsProvider),
            margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 80),
          ),
        ),
        data: (rooms) {
          if (rooms.isEmpty) {
            return EmptyState(
              type: EmptyStateType.rooms,
              title: l.noRoomsAvailable,
            );
          }
          return ListView.builder(
            padding: const EdgeInsets.fromLTRB(16, kToolbarHeight + 16, 16, 32),
            itemCount: rooms.length,
            itemBuilder: (ctx, i) {
              final room = rooms[i];
              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: GlassCard(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Container(
                        width: 56,
                        height: 56,
                        decoration: BoxDecoration(
                          color: room.available
                              ? SnowColors.successSoft
                              : SnowColors.dangerSoft,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Icon(
                          room.available
                              ? Icons.meeting_room_rounded
                              : Icons.no_meeting_room_rounded,
                          color: room.available
                              ? SnowColors.successStrong
                              : SnowColors.dangerStrong,
                          size: 26,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(room.name,
                                style: const TextStyle(
                                    fontWeight: FontWeight.w700, fontSize: 15)),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                Icon(Icons.people_outline_rounded,
                                    size: 14,
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onSurface
                                        .withValues(alpha: 0.5)),
                                const SizedBox(width: 4),
                                Text(
                                  l.capacity(room.capacity),
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onSurface
                                        .withValues(alpha: 0.5),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      if (room.available)
                        FilledButton(
                          onPressed: () =>
                              _showBookingSheet(context, ref, room, l),
                          style: FilledButton.styleFrom(
                            visualDensity: VisualDensity.compact,
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10)),
                          ),
                          child: Text(l.bookRoom,
                              style: const TextStyle(fontSize: 13)),
                        )
                      else
                        StatusBadge(label: l.occupied, tone: SnowStatusTone.danger),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }

  Future<void> _showBookingSheet(BuildContext context, WidgetRef ref,
      _Room room, AppLocalizations l) async {
    final booked = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _BookingSheet(room: room, l: l),
    );
    if (booked == true) {
      ref.invalidate(_roomsProvider);
      ref.invalidate(_myBookingsProvider);
    }
  }
}

// ── Booking sheet ─────────────────────────────────────────────────────────────

class _BookingSheet extends ConsumerStatefulWidget {
  const _BookingSheet({required this.room, required this.l});
  final _Room room;
  final AppLocalizations l;

  @override
  ConsumerState<_BookingSheet> createState() => _BookingSheetState();
}

class _BookingSheetState extends ConsumerState<_BookingSheet> {
  DateTime _start = DateTime.now().add(const Duration(hours: 1));
  DateTime _end = DateTime.now().add(const Duration(hours: 2));
  bool _busy = false;

  String _fmt(DateTime dt) =>
      DateFormat.yMd().add_Hm().format(dt);

  Future<void> _pickStart() async {
    final dt = await showDatePicker(
      context: context,
      initialDate: _start,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 90)),
    );
    if (dt == null || !mounted) return;
    final time = await showTimePicker(
        context: context, initialTime: TimeOfDay.fromDateTime(_start));
    if (time == null || !mounted) return;
    setState(() {
      _start = DateTime(dt.year, dt.month, dt.day, time.hour, time.minute);
      if (_end.isBefore(_start)) _end = _start.add(const Duration(hours: 1));
    });
  }

  Future<void> _pickEnd() async {
    final dt = await showDatePicker(
      context: context,
      initialDate: _end,
      firstDate: _start,
      lastDate: _start.add(const Duration(days: 1)),
    );
    if (dt == null || !mounted) return;
    final time = await showTimePicker(
        context: context, initialTime: TimeOfDay.fromDateTime(_end));
    if (time == null || !mounted) return;
    setState(() {
      _end = DateTime(dt.year, dt.month, dt.day, time.hour, time.minute);
    });
  }

  Future<void> _submit() async {
    setState(() => _busy = true);
    try {
      await ApiClient.rawDio.post('/meeting-rooms/${widget.room.id}/bookings', data: {
        'startTime': _start.toUtc().toIso8601String(),
        'endTime': _end.toUtc().toIso8601String(),
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.l.bookingConfirmed),
            behavior: SnackBarBehavior.floating,
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString()),
            backgroundColor: Theme.of(context).colorScheme.error,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = widget.l;
    final scheme = Theme.of(context).colorScheme;

    return Container(
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
      ),
      padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                margin: const EdgeInsets.symmetric(vertical: 12),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                    color: scheme.onSurface.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(4)),
              ),
            ),
            Text(l.bookRoom,
                style: Theme.of(context)
                    .textTheme
                    .titleLarge
                    ?.copyWith(fontWeight: FontWeight.w800)),
            const SizedBox(height: 4),
            Text(widget.room.name,
                style: TextStyle(
                    color: scheme.onSurface.withValues(alpha: 0.5), fontSize: 13)),
            const SizedBox(height: 20),

            // Start time
            _TimeField(
              label: l.startTime,
              value: _fmt(_start),
              icon: Icons.login_rounded,
              onTap: _pickStart,
            ),
            const SizedBox(height: 12),

            // End time
            _TimeField(
              label: l.endTime,
              value: _fmt(_end),
              icon: Icons.logout_rounded,
              onTap: _pickEnd,
            ),
            const SizedBox(height: 20),

            FilledButton(
              onPressed: _busy ? null : _submit,
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(52),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
              ),
              child: _busy
                  ? SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: scheme.onPrimary),
                    )
                  : Text(l.confirmAction),
            ),
          ],
        ),
      ),
    );
  }
}

class _TimeField extends StatelessWidget {
  const _TimeField({
    required this.label,
    required this.value,
    required this.icon,
    required this.onTap,
  });
  final String label;
  final String value;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: scheme.surfaceContainerHighest.withValues(alpha: 0.5),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: scheme.outline.withValues(alpha: 0.3)),
        ),
        child: Row(
          children: [
            Icon(icon, size: 18, color: scheme.primary),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label,
                      style: TextStyle(
                          fontSize: 11,
                          color: scheme.onSurface.withValues(alpha: 0.5))),
                  const SizedBox(height: 2),
                  Text(value,
                      style: const TextStyle(
                          fontWeight: FontWeight.w600, fontSize: 14)),
                ],
              ),
            ),
            Icon(Icons.edit_calendar_outlined,
                size: 18, color: scheme.onSurface.withValues(alpha: 0.4)),
          ],
        ),
      ),
    );
  }
}

// ── My bookings tab ───────────────────────────────────────────────────────────

class _MyBookingsTab extends ConsumerWidget {
  const _MyBookingsTab({required this.l});
  final AppLocalizations l;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bookingsAsync = ref.watch(_myBookingsProvider);

    return RefreshIndicator(
      onRefresh: () async => ref.invalidate(_myBookingsProvider),
      child: bookingsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: ErrorCard(
            error: e,
            onRetry: () => ref.invalidate(_myBookingsProvider),
            margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 80),
          ),
        ),
        data: (bookings) {
          if (bookings.isEmpty) {
            return EmptyState(type: EmptyStateType.rooms, title: l.myBookings);
          }
          return ListView.builder(
            padding: const EdgeInsets.fromLTRB(16, kToolbarHeight + 16, 16, 32),
            itemCount: bookings.length,
            itemBuilder: (ctx, i) {
              final b = bookings[i];
              final fmt = DateFormat.yMd().add_Hm();
              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: GlassCard(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.meeting_room_rounded, size: 20),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(b.roomName,
                                style: const TextStyle(
                                    fontWeight: FontWeight.w700, fontSize: 15)),
                          ),
                          _StatusChip(status: b.status),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Icon(Icons.login_rounded,
                              size: 14,
                              color: Theme.of(context)
                                  .colorScheme
                                  .onSurface
                                  .withValues(alpha: 0.45)),
                          const SizedBox(width: 6),
                          Text(fmt.format(b.start),
                              style: const TextStyle(fontSize: 12)),
                          const SizedBox(width: 14),
                          Icon(Icons.logout_rounded,
                              size: 14,
                              color: Theme.of(context)
                                  .colorScheme
                                  .onSurface
                                  .withValues(alpha: 0.45)),
                          const SizedBox(width: 6),
                          Text(fmt.format(b.end),
                              style: const TextStyle(fontSize: 12)),
                        ],
                      ),
                      if (b.status == 'CONFIRMED') ...[
                        const SizedBox(height: 10),
                        Align(
                          alignment: AlignmentDirectional.centerEnd,
                          child: OutlinedButton.icon(
                            onPressed: () async {
                              await ApiClient.rawDio.delete(
                                '/meeting-rooms/bookings/${b.id}',
                              );
                              ref.invalidate(_myBookingsProvider);
                              ref.invalidate(_roomsProvider);
                            },
                            icon: const Icon(Icons.cancel_outlined, size: 14),
                            label: Text(l.cancelBooking,
                                style: const TextStyle(fontSize: 12)),
                            style: OutlinedButton.styleFrom(
                              visualDensity: VisualDensity.compact,
                              foregroundColor: Theme.of(context).colorScheme.error,
                              side: BorderSide(
                                  color: Theme.of(context)
                                      .colorScheme
                                      .error
                                      .withValues(alpha: 0.5)),
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10)),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});
  final String status;

  @override
  Widget build(BuildContext context) {
    final tone = switch (status) {
      'CONFIRMED' => SnowStatusTone.success,
      'CANCELLED' => SnowStatusTone.danger,
      _ => SnowStatusTone.warning,
    };
    return StatusBadge(label: status, tone: tone, dense: true);
  }
}
