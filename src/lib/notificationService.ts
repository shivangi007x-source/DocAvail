import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { formatAppointmentDate, formatAppointmentTimeRange } from '@/lib/appointmentTime';
import { formatDoctorDisplayName } from '@/lib/utils';

export type NotificationType = 'APPOINTMENT_BOOKED' | 'APPOINTMENT_CANCELLED';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface NotificationDto {
  id: string;
  title: string;
  message: string;
  type: string;
  appointmentId: string | null;
  targetUrl: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

function buildTargetUrl(role: string, appointmentId: string | null): string | null {
  if (!appointmentId) return null;
  if (role === 'DOCTOR') {
    return `/doctor/appointments?appointmentId=${encodeURIComponent(appointmentId)}`;
  }
  if (role === 'PATIENT') {
    return `/patient/appointments?appointmentId=${encodeURIComponent(appointmentId)}`;
  }
  return null;
}

function toNotificationDto(
  row: {
    id: string;
    title: string;
    message: string;
    type: string;
    appointmentId: string | null;
    isRead: boolean;
    readAt: Date | null;
    createdAt: Date;
  },
  role: string
): NotificationDto {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    type: row.type,
    appointmentId: row.appointmentId,
    targetUrl: buildTargetUrl(role, row.appointmentId),
    isRead: row.isRead,
    readAt: row.readAt ? row.readAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

async function upsertAppointmentNotification(
  tx: Prisma.TransactionClient,
  input: {
    userId: string;
    type: NotificationType;
    appointmentId: string;
    title: string;
    message: string;
  }
) {
  return tx.notification.upsert({
    where: {
      userId_type_appointmentId: {
        userId: input.userId,
        type: input.type,
        appointmentId: input.appointmentId,
      },
    },
    update: {},
    create: {
      userId: input.userId,
      type: input.type,
      appointmentId: input.appointmentId,
      title: input.title,
      message: input.message,
      isRead: false,
    },
  });
}

export async function createAppointmentBookedNotifications(
  tx: Prisma.TransactionClient,
  params: {
    appointmentId: string;
    patientUserId: string;
    patientName: string;
    doctorUserId: string;
    doctorName: string;
    dateKey: string;
    startTime: string;
    endTime: string;
    consultationType: string;
    reasonForVisit: string;
  }
) {
  const formattedDate = formatAppointmentDate(params.dateKey, params.dateKey);
  const formattedTime = formatAppointmentTimeRange(params.startTime, params.endTime);
  const doctorLabel = formatDoctorDisplayName(params.doctorName);
  const visitMode = params.consultationType === 'VIDEO' ? 'video' : 'in-person';

  await upsertAppointmentNotification(tx, {
    userId: params.patientUserId,
    type: 'APPOINTMENT_BOOKED',
    appointmentId: params.appointmentId,
    title: 'Appointment Request Submitted',
    message: `Your ${visitMode} appointment request with ${doctorLabel} on ${formattedDate} at ${formattedTime} (IST) has been submitted and confirmed. Reason: ${params.reasonForVisit}.`,
  });

  await upsertAppointmentNotification(tx, {
    userId: params.doctorUserId,
    type: 'APPOINTMENT_BOOKED',
    appointmentId: params.appointmentId,
    title: 'New Appointment Booked',
    message: `${params.patientName} booked a ${visitMode} consultation on ${formattedDate} at ${formattedTime} (IST). Reason: ${params.reasonForVisit}.`,
  });
}

export async function createAppointmentCancelledNotifications(
  tx: Prisma.TransactionClient,
  params: {
    appointmentId: string;
    patientUserId: string;
    patientName: string;
    doctorUserId: string;
    doctorName: string;
    date: Date;
    appointmentDateKey: string | null;
    startTime: string;
    endTime: string;
  }
) {
  const formattedDate = formatAppointmentDate(params.date, params.appointmentDateKey);
  const formattedTime = formatAppointmentTimeRange(params.startTime, params.endTime);
  const doctorLabel = formatDoctorDisplayName(params.doctorName);

  await upsertAppointmentNotification(tx, {
    userId: params.patientUserId,
    type: 'APPOINTMENT_CANCELLED',
    appointmentId: params.appointmentId,
    title: 'Appointment Cancelled',
    message: `Your appointment with ${doctorLabel} on ${formattedDate} at ${formattedTime} (IST) has been cancelled.`,
  });

  await upsertAppointmentNotification(tx, {
    userId: params.doctorUserId,
    type: 'APPOINTMENT_CANCELLED',
    appointmentId: params.appointmentId,
    title: 'Appointment Cancelled by Patient',
    message: `${params.patientName} cancelled the consultation scheduled for ${formattedDate} at ${formattedTime} (IST). The time slot is now open.`,
  });
}

export async function getUserNotifications(userId: string, role: string, limit = 40) {
  const [rows, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }],
      take: Math.min(Math.max(limit, 1), 100),
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        appointmentId: true,
        isRead: true,
        readAt: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({
      where: { userId, isRead: false },
    }),
  ]);

  return {
    notifications: rows.map((row) => toNotificationDto(row, role)),
    unreadCount,
  };
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}

export type MarkReadResult =
  | { ok: true; notification: NotificationDto; unreadCount: number }
  | { ok: false; status: number; error: string };

export async function markNotificationAsRead(
  notificationId: string,
  callerUserId: string,
  callerRole: string
): Promise<MarkReadResult> {
  const trimmedId = typeof notificationId === 'string' ? notificationId.trim() : '';
  if (!trimmedId || !UUID_REGEX.test(trimmedId)) {
    return { ok: false, status: 400, error: 'Invalid notification ID format.' };
  }

  const existing = await prisma.notification.findUnique({
    where: { id: trimmedId },
    select: {
      id: true,
      userId: true,
      title: true,
      message: true,
      type: true,
      appointmentId: true,
      isRead: true,
      readAt: true,
      createdAt: true,
    },
  });

  if (!existing) {
    return { ok: false, status: 404, error: 'Notification not found.' };
  }

  if (existing.userId !== callerUserId) {
    return {
      ok: false,
      status: 403,
      error: 'Forbidden. You can only access your own notifications.',
    };
  }

  const updated = existing.isRead
    ? existing
    : await prisma.notification.update({
        where: { id: existing.id },
        data: { isRead: true, readAt: new Date() },
        select: {
          id: true,
          title: true,
          message: true,
          type: true,
          appointmentId: true,
          isRead: true,
          readAt: true,
          createdAt: true,
        },
      });

  const unreadCount = await getUnreadNotificationCount(callerUserId);

  return {
    ok: true,
    notification: toNotificationDto(updated, callerRole),
    unreadCount,
  };
}

export async function markAllNotificationsAsRead(callerUserId: string) {
  const result = await prisma.notification.updateMany({
    where: { userId: callerUserId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });

  return {
    updatedCount: result.count,
    unreadCount: 0,
  };
}
