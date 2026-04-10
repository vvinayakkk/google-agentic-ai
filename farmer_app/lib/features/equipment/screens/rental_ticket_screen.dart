import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../shared/models/equipment_model.dart';
import '../../../shared/providers/auth_provider.dart';
import '../../../shared/services/equipment_service.dart';
import '../../../shared/widgets/app_card.dart';
import '../../../shared/widgets/error_view.dart';
import '../../weather/widgets/glass_widgets.dart';
import '../widgets/equipment_shell.dart';

class RentalTicketScreen extends ConsumerStatefulWidget {
  final String rentalId;

  const RentalTicketScreen({super.key, required this.rentalId});

  @override
  ConsumerState<RentalTicketScreen> createState() => _RentalTicketScreenState();
}

class _RentalTicketScreenState extends ConsumerState<RentalTicketScreen> {
  bool _loading = true;
  bool _refreshing = false;
  String? _error;
  RentalTicket? _ticket;

  @override
  void initState() {
    super.initState();
    _primeData();
  }

  bool get _hasSnapshot => _ticket != null;

  Future<void> _primeData() async {
    await _loadTicket();
  }

  Future<void> _loadTicket({
    bool forceRefresh = false,
    bool silent = false,
  }) async {
    final hasSnapshot = _hasSnapshot;
    setState(() {
      if (silent || hasSnapshot) {
        _refreshing = true;
      } else {
        _loading = true;
      }
      _error = null;
    });

    try {
      final data = await ref.read(equipmentServiceProvider).getRentalById(
            widget.rentalId,
            preferCache: !forceRefresh,
            forceRefresh: forceRefresh,
          );
      if (!mounted) return;
      setState(() {
        _ticket = RentalTicket.fromJson(data);
        _loading = false;
        _refreshing = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _refreshing = false;
        if (!hasSnapshot) {
          _error = e.toString();
        }
        _loading = false;
      });
      if (hasSnapshot) {
        context.showSnack(
          'Unable to refresh ticket now. Showing recent data.'.tr(),
          isError: true,
        );
      }
    }
  }

  String _currentUserId() {
    final user = ref.read(authStateProvider).value?.user;
    return (user?['uid'] ?? user?['id'] ?? user?['user_id'] ?? '').toString();
  }

  Future<void> _runAction(String action) async {
    final ticket = _ticket;
    if (ticket == null) return;

    try {
      final svc = ref.read(equipmentServiceProvider);
      if (action == 'cancel') await svc.cancelRental(ticket.id);
      if (action == 'approve') await svc.approveRental(ticket.id);
      if (action == 'reject') await svc.rejectRental(ticket.id);
      if (action == 'complete') await svc.completeRental(ticket.id);
      if (!mounted) return;
      context.showSnack('Updated successfully'.tr());
      _loadTicket(forceRefresh: true);
    } catch (e) {
      if (!mounted) return;
      context.showSnack(e.toString(), isError: true);
    }
  }

  LinearGradient _ticketGradient(String status) {
    final s = status.toLowerCase();
    if (s == 'pending') return const LinearGradient(colors: [Color(0xFFF59E0B), Color(0xFFD97706)]);
    if (s == 'approved') return const LinearGradient(colors: [Color(0xFF10B981), Color(0xFF047857)]);
    if (s == 'completed') return const LinearGradient(colors: [Color(0xFF3B82F6), Color(0xFF1D4ED8)]);
    return const LinearGradient(colors: [Color(0xFF9CA3AF), Color(0xFF6B7280)]);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Rental Ticket'.tr()),
        elevation: 0,
        scrolledUnderElevation: 0,
        surfaceTintColor: Colors.transparent,
      ),
      body: EquipmentPageBackground(
        child: _loading && !_hasSnapshot
            ? const EquipmentContentSkeleton(cardCount: 6)
            : _error != null && !_hasSnapshot
                ? ErrorView(message: _error!, onRetry: () => _loadTicket(forceRefresh: true))
                : _ticket == null
                    ? const SizedBox.shrink()
                    : RefreshIndicator(
                        onRefresh: () => _loadTicket(forceRefresh: true),
                        child: ListView(
                          padding: const EdgeInsets.all(AppSpacing.lg),
                          children: [
                            EquipmentRefreshStrip(
                              refreshing: _refreshing,
                              label: 'Refreshing ticket status and timeline...'.tr(),
                            ),
                            _ticketCard(_ticket!),
                            const SizedBox(height: AppSpacing.md),
                            _statusTimeline(_ticket!),
                            const SizedBox(height: AppSpacing.md),
                            _detailsCard(_ticket!),
                            const SizedBox(height: AppSpacing.md),
                            _actionButtons(_ticket!),
                          ],
                        ),
                      ),
      ),
    );
  }

  Widget _ticketCard(RentalTicket ticket) {
    final status = ticket.status.toLowerCase();
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        gradient: _ticketGradient(status),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.white.withValues(alpha: 0.2),
            blurRadius: 18,
            spreadRadius: 1,
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(ticket.equipmentName, style: context.textTheme.titleLarge?.copyWith(color: Colors.white, fontWeight: FontWeight.w900)),
                    const SizedBox(height: AppSpacing.xs),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: AppSpacing.xs),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.18),
                        borderRadius: BorderRadius.circular(AppRadius.full),
                      ),
                      child: Text(
                        'Equipment Rental'.tr(),
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              SizedBox(
                height: 86,
                child: CustomPaint(
                  painter: _DashedLinePainter(color: Colors.white.withValues(alpha: 0.8)),
                  child: const SizedBox(width: 1),
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text('#${ticket.id.length > 8 ? ticket.id.substring(ticket.id.length - 8) : ticket.id}', style: context.textTheme.bodySmall?.copyWith(color: Colors.white, fontWeight: FontWeight.w800)),
                  const SizedBox(height: AppSpacing.xs),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: AppSpacing.xs),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.24),
                      borderRadius: BorderRadius.circular(AppRadius.full),
                    ),
                    child: Text(status.toUpperCase(), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 11)),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(DateFormat('dd MMM').format(ticket.startDate), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
              const SizedBox(width: AppSpacing.sm),
              const Icon(Icons.arrow_forward, color: Colors.white),
              const SizedBox(width: AppSpacing.sm),
              Text(DateFormat('dd MMM').format(ticket.endDate), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
              const SizedBox(width: AppSpacing.md),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: AppSpacing.xs),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(AppRadius.full),
                ),
                child: Text(
                  '${ticket.durationDays} ${'Days'.tr()}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _statusTimeline(RentalTicket ticket) {
    final status = ticket.status.toLowerCase();
    final steps = [
      _TimelineStep('Request Submitted'.tr(), done: true, at: ticket.createdAt),
      _TimelineStep('Under Review'.tr(), done: status != 'pending', at: ticket.updatedAt),
      _TimelineStep(
        (status == 'rejected' ? 'Rejected' : 'Approved').tr(),
        done: status == 'approved' || status == 'completed' || status == 'rejected',
        at: ticket.updatedAt,
      ),
      _TimelineStep(
        'In Progress'.tr(),
        done: status == 'approved' || status == 'completed',
        at: ticket.updatedAt,
      ),
      _TimelineStep('Completed'.tr(), done: status == 'completed', at: ticket.completedAt),
    ];

    final isRejected = status == 'rejected' || status == 'cancelled';

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Status Timeline'.tr(),
            style: context.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          ...List.generate(steps.length, (i) {
            final step = steps[i];
            final isActive = step.done && (i == steps.lastIndexWhere((e) => e.done));
            return Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: isActive ? 18 : 14,
                  height: isActive ? 18 : 14,
                  margin: const EdgeInsets.only(top: 2),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: step.done ? (isRejected && i >= 2 ? AppColors.danger : AppColors.success) : Colors.transparent,
                    border: Border.all(color: step.done ? Colors.transparent : context.appColors.border),
                  ),
                  child: step.done
                      ? Icon(isRejected && i >= 2 ? Icons.close : Icons.check, size: 11, color: Colors.white)
                      : null,
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.md),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(step.title, style: context.textTheme.bodyMedium?.copyWith(fontWeight: isActive ? FontWeight.w800 : FontWeight.w600)),
                        if (step.at != null)
                          Text(step.at!.timeAgo, style: context.textTheme.bodySmall?.copyWith(color: context.appColors.textSecondary)),
                      ],
                    ),
                  ),
                ),
              ],
            );
          }),
        ],
      ),
    );
  }

  Widget _detailsCard(RentalTicket ticket) {
    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Details'.tr(),
            style: context.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          _detailRow('Equipment'.tr(), ticket.equipmentName),
          _detailRow('Start'.tr(), DateFormat('EEE, dd MMM').format(ticket.startDate)),
          _detailRow('End'.tr(), DateFormat('EEE, dd MMM').format(ticket.endDate)),
          _detailRow('Duration'.tr(), '${ticket.durationDays} ${'days'.tr()}'),
          if (ticket.message.trim().isNotEmpty)
            _detailRow('Message'.tr(), ticket.message),
        ],
      ),
    );
  }

  Widget _detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.xs),
      child: Row(
        children: [
          SizedBox(width: 100, child: Text(label, style: context.textTheme.bodySmall?.copyWith(color: context.appColors.textSecondary))),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }

  Widget _actionButtons(RentalTicket ticket) {
    final status = ticket.status.toLowerCase();
    final userId = _currentUserId();
    final isOwner = userId.isNotEmpty && userId == ticket.ownerId;
    final isRenter = userId.isNotEmpty && userId == ticket.renterId;

    if (isRenter && (status == 'pending' || status == 'approved')) {
      return OutlinedButton(
        onPressed: () => _runAction('cancel'),
        style: OutlinedButton.styleFrom(foregroundColor: AppColors.danger),
        child: Text('Cancel Rental'.tr()),
      );
    }

    if (isOwner && status == 'pending') {
      return Row(
        children: [
          Expanded(
            child: ElevatedButton(
              onPressed: () => _runAction('approve'),
              child: Text('Approve'.tr()),
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: OutlinedButton(
              onPressed: () => _runAction('reject'),
              style: OutlinedButton.styleFrom(foregroundColor: AppColors.danger),
              child: Text('Reject'.tr()),
            ),
          ),
        ],
      );
    }

    if (isOwner && status == 'approved') {
      return ElevatedButton(
        onPressed: () => _runAction('complete'),
        style: ElevatedButton.styleFrom(backgroundColor: AppColors.info),
        child: Text('Mark Complete'.tr()),
      );
    }

    return const SizedBox.shrink();
  }
}

class _TimelineStep {
  final String title;
  final bool done;
  final DateTime? at;

  _TimelineStep(this.title, {required this.done, this.at});
}

class _DashedLinePainter extends CustomPainter {
  final Color color;

  _DashedLinePainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1.4;

    const dash = 4.0;
    const gap = 3.0;
    double y = 0;
    while (y < size.height) {
      canvas.drawLine(Offset(0, y), Offset(0, y + dash), paint);
      y += dash + gap;
    }
  }

  @override
  bool shouldRepaint(covariant _DashedLinePainter oldDelegate) => oldDelegate.color != color;
}
