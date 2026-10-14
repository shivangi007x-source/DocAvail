'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Clock, Calendar } from 'lucide-react';

interface SlotPickerProps {
  slots?: { id: string; time: string; available: boolean }[];
  selectedSlotId?: string;
  onSelectSlot?: (slotId: string) => void;
}

const DEFAULT_SLOTS = [
  { id: 's1', time: '09:00 AM', available: true },
  { id: 's2', time: '09:30 AM', available: true },
  { id: 's3', time: '10:00 AM', available: false },
  { id: 's4', time: '10:30 AM', available: true },
  { id: 's5', time: '11:00 AM', available: true },
  { id: 's6', time: '02:00 PM', available: true },
  { id: 's7', time: '02:30 PM', available: true },
  { id: 's8', time: '03:00 PM', available: false },
  { id: 's9', time: '03:30 PM', available: true },
];

export const SlotPicker: React.FC<SlotPickerProps> = ({
  slots = DEFAULT_SLOTS,
  selectedSlotId: externalSelectedSlotId,
  onSelectSlot,
}) => {
  const [internalSelectedSlotId, setInternalSelectedSlotId] = useState<string>('s1');

  const selectedSlotId = externalSelectedSlotId !== undefined ? externalSelectedSlotId : internalSelectedSlotId;

  const handleSelect = (id: string) => {
    setInternalSelectedSlotId(id);
    onSelectSlot?.(id);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
        <span className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5 text-brand-600" />
          Today&apos;s Consultation Slots
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          30 min duration
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {slots.map((slot) => {
          const isSelected = selectedSlotId === slot.id;
          return (
            <button
              key={slot.id}
              type="button"
              disabled={!slot.available}
              onClick={() => handleSelect(slot.id)}
              className={cn(
                'flex items-center justify-center p-2.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer select-none',
                slot.available && !isSelected && 'bg-white border-slate-200 text-slate-700 hover:border-brand-400 hover:bg-brand-50/40',
                slot.available && isSelected && 'bg-brand-600 border-brand-600 text-white shadow-sm ring-2 ring-brand-300',
                !slot.available && 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed line-through'
              )}
            >
              {slot.time}
            </button>
          );
        })}
      </div>
    </div>
  );
};
