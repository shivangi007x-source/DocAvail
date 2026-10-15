import React from 'react';
import Image from 'next/image';
import { DoctorSummary } from '@/lib/types';
import { Card } from './Card';
import { Badge } from './Badge';
import { Button } from './Button';
import { StatusIndicator } from './StatusIndicator';
import { formatCurrency } from '@/lib/utils';
import { Star, MapPin, Building2, CalendarCheck, ShieldCheck, Clock } from 'lucide-react';

interface DoctorCardProps {
  doctor: DoctorSummary;
  onBookSlot?: (doctorId: string) => void;
}

export const DoctorCard: React.FC<DoctorCardProps> = ({ doctor, onBookSlot }) => {
  const isVerified = doctor.isVerified || doctor.verificationStatus === 'APPROVED';
  const qualification = doctor.qualification || doctor.qualifications || '';
  const fee = doctor.consultationFee ?? doctor.fee ?? 0;

  const formatTimeAgo = (dateStr?: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSeconds < 60) return 'Just now';
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const timeAgo = formatTimeAgo(doctor.statusUpdatedAt);

  return (
    <Card className="overflow-hidden flex flex-col justify-between border border-slate-200/90 hover:border-brand-300 group">
      <div className="p-5 space-y-4">
        {/* Top Bar: Live Status & Verified Badge */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <StatusIndicator status={doctor.availabilityStatus} />
          </div>
          <div className="flex items-center gap-1.5">
            {timeAgo && (
              <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                <Clock className="h-3 w-3 text-slate-300" />
                {timeAgo}
              </span>
            )}
            {isVerified && (
              <Badge variant="verified" className="gap-1 text-[11px]">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                Verified
              </Badge>
            )}
          </div>
        </div>

        {/* Doctor Info Row */}
        <div className="flex gap-4 items-start">
          <div className="relative h-16 w-16 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
            <Image
              src={doctor.avatarUrl || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=300&auto=format&fit=crop'}
              alt={doctor.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
          <div className="space-y-1 min-w-0">
            <h3 className="font-bold text-slate-900 text-base leading-tight truncate group-hover:text-brand-700 transition-colors">
              {doctor.name}
            </h3>
            <p className="text-xs font-semibold text-brand-600">{doctor.specialization}</p>
            <p className="text-xs text-slate-500 truncate">{qualification}</p>
          </div>
        </div>

        {/* Rating & Fee */}
        <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg text-xs">
          <div className="flex items-center gap-1 font-semibold text-slate-800">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span>{doctor.rating}</span>
            <span className="text-slate-400 font-normal">({doctor.reviewCount} reviews)</span>
          </div>
          <div className="font-bold text-slate-900">
            <span className="text-slate-400 font-normal mr-1">Fee:</span>
            {formatCurrency(fee)}
          </div>
        </div>

        {/* Clinic Details */}
        <div className="space-y-1.5 text-xs text-slate-600 pt-1">
          <div className="flex items-center gap-1.5 truncate">
            <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="font-medium text-slate-800 truncate">{doctor.clinicName}</span>
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{doctor.clinicAddress}, {doctor.city}</span>
          </div>
        </div>

        {/* Doctor Status Note if available */}
        {doctor.statusNote && (
          <div className="text-[11px] italic bg-brand-50/60 border border-brand-100 text-brand-900 p-2 rounded-md">
            &ldquo;{doctor.statusNote}&rdquo;
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="px-5 pb-5 pt-0">
        <Button
          onClick={() => onBookSlot?.(doctor.id)}
          disabled={doctor.availabilityStatus === 'UNAVAILABLE'}
          className="w-full gap-2 text-xs font-semibold"
          variant={doctor.availabilityStatus === 'AVAILABLE' ? 'default' : 'secondary'}
        >
          <CalendarCheck className="h-4 w-4" />
          {doctor.availabilityStatus === 'AVAILABLE'
            ? 'Book Appointment Slot'
            : doctor.availabilityStatus === 'BUSY'
            ? 'View Next Available Slot'
            : 'Currently Offline'}
        </Button>
      </div>
    </Card>
  );
};
