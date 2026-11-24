'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Clock, Calendar, AlertCircle } from 'lucide-react';

export interface SlotOption {
  id: string;
  time: string;
  endTime?: string;
  available: boolean;
  isBooked?: boolean;
}

interface SlotPickerProps {
  slots?: SlotOption[];
  selectedSlotId?: string;
  onSelectSlot?: (slotId: string) => void;
  dateLabel?: string;
  remainingCapacity?: number;
  dailyLimit?: number;
  isDailyLimitReached?: boolean;
  isLoading?: boolean;
}

const DEFAULT_SLOTS: SlotOption[] = [
  { id: 'slot-1', time: '09:30 AM', endTime: '10:00 AM', available: true },
  { id: 'slot-2', time: '10:00 AM', endTime: '10:30 AM', available: true },
  { id: 'slot-3', time: '10:30 AM', endTime: '11:00 AM', available: true },
  { id: 'slot-4', time: '11:00 AM', endTime: '11:30 AM', available: true },
  { id: 'slot-5', time: '11:30 AM', endTime: '12:00 PM', available: true },
  { id: 'slot-6', time: '12:00 PM', endTime: '12:30 PM', available: true },
  { id: 'slot-7', time: '02:00 PM', endTime: '02:30 PM', available: true },
  { id: 'slot-8', time: '02:30 PM', endTime: '03:00 PM', available: true },
  { id: 'slot-9', time: '03:00 PM', endTime: '03:30 PM', available: true },
  { id: 'slot-10', time: '03:30 PM', endTime: '04:00 PM', available: true },
  { id: 'slot-11', time: '04:00 PM', endTime: '04:30 PM', available: true },
  { id: 'slot-12', time: '04:30 PM', endTime: '05:00 PM', available: true },
];

export const SlotPicker: React.FC<SlotPickerProps> = ({
  slots = DEFAULT_SLOTS,
  selectedSlotId: externalSelectedSlotId,
  onSelectSlot,
  dateLabel,
  remainingCapacity,
  dailyLimit,
  isDailyLimitReached = false,
  isLoading = false,
}) => {
  const [internalSelectedSlotId, setInternalSelectedSlotId] = useState<string>('slot-1');

  const selectedSlotId =
    externalSelectedSlotId !== undefined ? externalSelectedSlotId : internalSelectedSlotId;

  const handleSelect = (id: string) => {
    setInternalSelectedSlotId(id);
    onSelectSlot?.(id);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 font-medium">
        <span className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5 text-brand-600" />
          {dateLabel ? `Slots for ${dateLabel} (IST)` : 'Consultation Slots (IST)'}
        </span>
        <div className="flex items-center gap-2">
          {typeof remainingCapacity === 'number' && typeof dailyLimit === 'number' && (
            <span
              className={cn(
                'px-2 py-0.5 rounded-full text-[10px] font-bold border',
                remainingCapacity > 0
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              )}
            >
              {remainingCapacity}/{dailyLimit} daily capacity left
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            30 min
          </span>
        </div>
      </div>

      {isDailyLimitReached && (
        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>
            Daily limit of {dailyLimit ?? 10} appointments reached for this date. Please choose another date.
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-9 rounded-lg bg-slate-100 animate-pulse border border-slate-200" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {slots.map((slot) => {
            const isSelected = selectedSlotId === slot.id && slot.available;
            return (
              <button
                key={slot.id}
                type="button"
                disabled={!slot.available}
                onClick={() => handleSelect(slot.id)}
                title={slot.endTime ? `${slot.time} – ${slot.endTime}` : slot.time}
                className={cn(
                  'flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer select-none',
                  slot.available &&
                    !isSelected &&
                    'bg-white border-slate-200 text-slate-700 hover:border-brand-400 hover:bg-brand-50/40',
                  slot.available &&
                    isSelected &&
                    'bg-brand-600 border-brand-600 text-white shadow-sm ring-2 ring-brand-300',
                  !slot.available &&
                    'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed line-through'
                )}
              >
                <span>{slot.time}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
