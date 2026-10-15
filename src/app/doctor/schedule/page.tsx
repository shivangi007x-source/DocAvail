'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dropdown } from '@/components/ui/Dropdown';
import { useToast } from '@/components/ui/Toast';
import { WorkingHoursItem } from '@/lib/types';
import {
  Clock,
  Calendar,
  ArrowLeft,
  Save,
  CheckCircle2,
  Copy,
  Coffee,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const DAY_NAMES = [
  { day: 1, name: 'Monday' },
  { day: 2, name: 'Tuesday' },
  { day: 3, name: 'Wednesday' },
  { day: 4, name: 'Thursday' },
  { day: 5, name: 'Friday' },
  { day: 6, name: 'Saturday' },
  { day: 0, name: 'Sunday' },
];

export default function DoctorSchedulePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [schedule, setSchedule] = useState<WorkingHoursItem[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<number, string>>({});
  const [globalSlotDuration, setGlobalSlotDuration] = useState<number>(30);

  // Fetch current schedule
  const { data, isLoading } = useQuery({
    queryKey: ['doctor-schedule'],
    queryFn: async () => {
      const res = await fetch('/api/doctor/me/schedule');
      if (!res.ok) throw new Error('Failed to load schedule');
      return res.json();
    },
  });

  useEffect(() => {
    if (data?.schedule) {
      setSchedule(data.schedule);
      if (data.schedule[1]?.slotDurationMinutes) {
        setGlobalSlotDuration(data.schedule[1].slotDurationMinutes);
      }
    }
  }, [data]);

  // Validation function
  const validateSchedule = (items: WorkingHoursItem[]): boolean => {
    const errors: Record<number, string> = {};
    let isValid = true;

    for (const item of items) {
      if (!item.isActive) continue;

      const [startH, startM] = item.startTime.split(':').map(Number);
      const [endH, endM] = item.endTime.split(':').map(Number);
      const startMin = startH * 60 + startM;
      const endMin = endH * 60 + endM;

      if (endMin <= startMin) {
        errors[item.dayOfWeek] = 'End time must be after start time';
        isValid = false;
        continue;
      }

      if (item.breakStart && item.breakEnd) {
        const [bStartH, bStartM] = item.breakStart.split(':').map(Number);
        const [bEndH, bEndM] = item.breakEnd.split(':').map(Number);
        const bStartMin = bStartH * 60 + bStartM;
        const bEndMin = bEndH * 60 + bEndM;

        if (bEndMin <= bStartMin) {
          errors[item.dayOfWeek] = 'Break end must be after break start';
          isValid = false;
          continue;
        }

        if (bStartMin < startMin || bEndMin > endMin) {
          errors[item.dayOfWeek] = 'Break must fall within working hours';
          isValid = false;
          continue;
        }
      }
    }

    setValidationErrors(errors);
    return isValid;
  };

  const handleDayToggle = (dayOfWeek: number) => {
    setSchedule((prev) =>
      prev.map((item) =>
        item.dayOfWeek === dayOfWeek ? { ...item, isActive: !item.isActive } : item
      )
    );
  };

  const handleTimeChange = (
    dayOfWeek: number,
    field: 'startTime' | 'endTime' | 'breakStart' | 'breakEnd',
    value: string
  ) => {
    setSchedule((prev) => {
      const updated = prev.map((item) =>
        item.dayOfWeek === dayOfWeek ? { ...item, [field]: value } : item
      );
      validateSchedule(updated);
      return updated;
    });
  };

  const handleBreakToggle = (dayOfWeek: number) => {
    setSchedule((prev) =>
      prev.map((item) => {
        if (item.dayOfWeek !== dayOfWeek) return item;
        const hasBreak = Boolean(item.breakStart && item.breakEnd);
        return {
          ...item,
          breakStart: hasBreak ? null : '13:00',
          breakEnd: hasBreak ? null : '14:00',
        };
      })
    );
  };

  const copyMondayToWeekdays = () => {
    const monday = schedule.find((s) => s.dayOfWeek === 1);
    if (!monday) return;

    setSchedule((prev) =>
      prev.map((item) => {
        // Weekdays: Tue (2) to Fri (5)
        if (item.dayOfWeek >= 2 && item.dayOfWeek <= 5) {
          return {
            ...item,
            isActive: monday.isActive,
            startTime: monday.startTime,
            endTime: monday.endTime,
            breakStart: monday.breakStart,
            breakEnd: monday.breakEnd,
            slotDurationMinutes: monday.slotDurationMinutes,
          };
        }
        return item;
      })
    );
    toast('Copied', 'Monday schedule applied to Tuesday through Friday.', 'info');
  };

  const applySlotDurationToAll = (duration: number) => {
    setGlobalSlotDuration(duration);
    setSchedule((prev) =>
      prev.map((item) => ({ ...item, slotDurationMinutes: duration }))
    );
  };

  // Save schedule mutation
  const saveScheduleMutation = useMutation({
    mutationFn: async (items: WorkingHoursItem[]) => {
      const res = await fetch('/api/doctor/me/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule: items }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save schedule');
      }
      return data;
    },
    onSuccess: () => {
      toast('Schedule Saved', 'Your weekly working hours have been updated.', 'success');
      queryClient.invalidateQueries({ queryKey: ['doctor-schedule'] });
    },
    onError: (err: any) => {
      toast('Save Failed', err.message || 'Please check your inputs', 'error');
    },
  });

  const handleSave = () => {
    if (!validateSchedule(schedule)) {
      toast('Validation Error', 'Please resolve schedule errors before saving.', 'error');
      return;
    }
    saveScheduleMutation.mutate(schedule);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <Link
            href="/doctor/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-brand-700 font-semibold hover:underline mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Working Hours & Schedule Planner
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Define active days, consultation hours, lunch breaks, and appointment slot duration.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="default"
            onClick={handleSave}
            isLoading={saveScheduleMutation.isPending}
            className="gap-2 px-6 shadow-md"
          >
            <Save className="h-4 w-4" />
            Save Weekly Schedule
          </Button>
        </div>
      </div>

      {/* Global Configuration Bar */}
      <Card className="p-5 border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Default Appointment Slot Duration:
            </label>
            <div className="flex items-center gap-2">
              {[15, 30, 45, 60].map((dur) => (
                <button
                  key={dur}
                  type="button"
                  onClick={() => applySlotDurationToAll(dur)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    globalSlotDuration === dur
                      ? 'bg-brand-600 border-brand-600 text-white shadow-sm'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {dur} mins
                </button>
              ))}
            </div>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={copyMondayToWeekdays}
          className="gap-1.5 text-xs"
        >
          <Copy className="h-3.5 w-3.5 text-brand-600" />
          Apply Monday Schedule to All Weekdays (Tue–Fri)
        </Button>
      </Card>

      {/* Schedule Table / Cards for Monday through Sunday */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading schedule...</div>
      ) : (
        <div className="space-y-4">
          {DAY_NAMES.map(({ day, name }) => {
            const item = schedule.find((s) => s.dayOfWeek === day) || {
              dayOfWeek: day,
              startTime: '09:00',
              endTime: '17:00',
              breakStart: null,
              breakEnd: null,
              slotDurationMinutes: 30,
              isActive: false,
            };

            const hasError = validationErrors[day];
            const hasBreak = Boolean(item.breakStart && item.breakEnd);

            return (
              <Card
                key={day}
                className={`p-5 border transition-all ${
                  item.isActive
                    ? 'border-slate-300 bg-white shadow-sm'
                    : 'border-slate-200 bg-slate-50/70 opacity-70'
                } ${hasError ? 'border-rose-400 ring-1 ring-rose-300' : ''}`}
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                  {/* Day Toggle & Name */}
                  <div className="lg:col-span-3 flex items-center justify-between sm:justify-start gap-4">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.isActive}
                        onChange={() => handleDayToggle(day)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                    </label>

                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{name}</h3>
                      <span className="text-[11px] font-medium text-slate-400">
                        {item.isActive ? 'Active Working Day' : 'Day Off / Closed'}
                      </span>
                    </div>
                  </div>

                  {/* Working Hours Time Inputs */}
                  {item.isActive ? (
                    <>
                      <div className="lg:col-span-4 flex items-center gap-3">
                        <div className="flex-1">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Start Time
                          </label>
                          <input
                            type="time"
                            value={item.startTime}
                            onChange={(e) => handleTimeChange(day, 'startTime', e.target.value)}
                            className="w-full text-xs p-2 rounded-lg border border-slate-300 font-mono bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                        </div>
                        <span className="text-slate-400 pt-5 text-xs font-bold">to</span>
                        <div className="flex-1">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            End Time
                          </label>
                          <input
                            type="time"
                            value={item.endTime}
                            onChange={(e) => handleTimeChange(day, 'endTime', e.target.value)}
                            className="w-full text-xs p-2 rounded-lg border border-slate-300 font-mono bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                        </div>
                      </div>

                      {/* Break Period Section */}
                      <div className="lg:col-span-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-2">
                          <Coffee className="h-4 w-4 text-amber-600 shrink-0" />
                          <button
                            type="button"
                            onClick={() => handleBreakToggle(day)}
                            className="text-xs font-semibold text-slate-700 hover:text-brand-700 underline cursor-pointer"
                          >
                            {hasBreak ? 'Remove Break' : '+ Add Lunch/Rest Break'}
                          </button>
                        </div>

                        {hasBreak && (
                          <div className="flex items-center gap-2">
                            <input
                              type="time"
                              value={item.breakStart || '13:00'}
                              onChange={(e) => handleTimeChange(day, 'breakStart', e.target.value)}
                              className="text-xs p-1.5 rounded border border-slate-300 font-mono bg-white"
                            />
                            <span className="text-xs text-slate-400">–</span>
                            <input
                              type="time"
                              value={item.breakEnd || '14:00'}
                              onChange={(e) => handleTimeChange(day, 'breakEnd', e.target.value)}
                              className="text-xs p-1.5 rounded border border-slate-300 font-mono bg-white"
                            />
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="lg:col-span-9 text-xs text-slate-400 italic">
                      No appointment consultation slots will be scheduled on this day.
                    </div>
                  )}
                </div>

                {/* Day Validation Error */}
                {hasError && (
                  <div className="mt-3 pt-2 border-t border-rose-100 flex items-center gap-1.5 text-xs font-semibold text-rose-600">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>{hasError}</span>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Bottom Save Bar */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Info className="h-4 w-4 text-brand-600" />
          <span>Working slots will be automatically generated according to these hours.</span>
        </div>
        <Button
          variant="default"
          onClick={handleSave}
          isLoading={saveScheduleMutation.isPending}
          className="gap-2 px-8 shadow-md"
        >
          <Save className="h-4 w-4" />
          Save Weekly Schedule
        </Button>
      </div>
    </div>
  );
}
