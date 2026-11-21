'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  User,
  Stethoscope,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  Lock,
  Sparkles,
} from 'lucide-react';

interface RoleCardConfig {
  id: 'PATIENT' | 'DOCTOR' | 'ADMIN';
  title: string;
  subtitle: string;
  badgeText: string;
  badgeVariant: 'available' | 'verified' | 'busy';
  accentGradient: string;
  iconBg: string;
  bullets: string[];
  ctaLabel: string;
  href: string;
  securityNote?: string;
  icon: React.ReactNode;
}

const ROLE_CARDS: RoleCardConfig[] = [
  {
    id: 'PATIENT',
    title: 'Patient',
    subtitle: 'Healthcare Access Across Jammu & Kashmir',
    badgeText: 'GUIDED 4-STEP ONBOARDING',
    badgeVariant: 'available',
    accentGradient: 'from-emerald-500/10 via-white to-brand-50/40',
    iconBg: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    bullets: [
      'Find admin-approved doctors and genuine healthcare facilities across all 20 J&K districts.',
      'Discover nearby hospitals and clinics with optional browser geolocation.',
      'Your medical records and identity stay private and never visible to other patients.',
    ],
    ctaLabel: 'Continue as Patient',
    href: '/register?role=PATIENT',
    icon: <User className="h-7 w-7" />,
  },
  {
    id: 'DOCTOR',
    title: 'Doctor',
    subtitle: 'Verified Healthcare Professional Portal',
    badgeText: 'ADMIN VERIFICATION REQUIRED',
    badgeVariant: 'verified',
    accentGradient: 'from-brand-500/10 via-white to-sky-50/50',
    iconBg: 'bg-brand-100 text-brand-700 border-brand-200',
    bullets: [
      'Create your verified clinician profile with qualifications, fee (₹ INR), and J&K clinic/facility affiliation.',
      'Connect with patients and update live consultation availability.',
      'Upload optional supporting verification documents for secure administrator review.',
    ],
    ctaLabel: 'Continue as Doctor',
    href: '/register?role=DOCTOR',
    securityNote: 'Accounts stay PENDING until reviewed and approved by a DocAvail administrator.',
    icon: <Stethoscope className="h-7 w-7" />,
  },
  {
    id: 'ADMIN',
    title: 'Administrator',
    subtitle: 'Platform Governance & Verification',
    badgeText: 'RESTRICTED PORTAL ACCESS',
    badgeVariant: 'busy',
    accentGradient: 'from-amber-500/10 via-white to-slate-50',
    iconBg: 'bg-amber-100 text-amber-800 border-amber-200',
    bullets: [
      'Review and manage incoming patient and doctor registration requests.',
      'Approve or reject healthcare professionals and inspect uploaded verification credentials.',
      'Oversee platform users and Jammu & Kashmir healthcare facility records.',
    ],
    ctaLabel: 'Continue to Admin Access',
    href: '/admin-access',
    securityNote: 'Public administrator registration is disabled. Authorised sign-in only.',
    icon: <ShieldCheck className="h-7 w-7" />,
  },
];

export function RoleFlashcards() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const dragStartX = useRef<number | null>(null);

  const goToIndex = (nextIdx: number) => {
    const wrapped = (nextIdx + ROLE_CARDS.length) % ROLE_CARDS.length;
    setDirection(nextIdx > activeIndex || (activeIndex === ROLE_CARDS.length - 1 && wrapped === 0) ? 'next' : 'prev');
    setActiveIndex(wrapped);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    dragStartX.current = e.clientX;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragStartX.current === null) return;
    const delta = e.clientX - dragStartX.current;
    dragStartX.current = null;
    if (delta < -45) {
      goToIndex(activeIndex + 1);
    } else if (delta > 45) {
      goToIndex(activeIndex - 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      goToIndex(activeIndex + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goToIndex(activeIndex - 1);
    }
  };

  const activeCard = ROLE_CARDS[activeIndex];

  return (
    <div
      className="space-y-6 focus:outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label="Role selection flashcards. Use Left and Right arrow keys or swipe to switch roles."
    >
      {/* Top Role Selector Pills */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {ROLE_CARDS.map((card, idx) => {
          const isActive = idx === activeIndex;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => goToIndex(idx)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 border ${
                isActive
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-105'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300 hover:text-brand-700'
              }`}
            >
              {card.title}
            </button>
          );
        })}
      </div>

      {/* Swipeable Flashcard Deck */}
      <div className="relative flex items-center justify-center gap-3 sm:gap-5">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Previous role card"
          onClick={() => goToIndex(activeIndex - 1)}
          className="shrink-0 rounded-full h-10 w-10 shadow-sm bg-white hover:bg-brand-50"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          className="w-full max-w-lg touch-pan-y select-none cursor-grab active:cursor-grabbing"
        >
          <div
            key={activeCard.id}
            style={{
              animation: `${direction === 'next' ? 'slideInRight' : 'slideInLeft'} 260ms cubic-bezier(0.22, 1, 0.36, 1)`,
            }}
            className={`rounded-3xl border-2 border-slate-200/90 bg-gradient-to-br ${activeCard.accentGradient} p-6 sm:p-8 shadow-xl space-y-6 transition-all`}
          >
            {/* Card Header */}
            <div className="flex items-start justify-between gap-4">
              <div className={`h-14 w-14 rounded-2xl border flex items-center justify-center shadow-sm ${activeCard.iconBg}`}>
                {activeCard.icon}
              </div>
              <Badge variant={activeCard.badgeVariant} className="text-[10px]">
                {activeCard.badgeText}
              </Badge>
            </div>

            {/* Title & Subtitle */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <Sparkles className="h-3.5 w-3.5 text-brand-500" />
                <span>
                  Role {activeIndex + 1} of {ROLE_CARDS.length}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {activeCard.title}
              </h2>
              <p className="text-xs sm:text-sm font-medium text-slate-600">
                {activeCard.subtitle}
              </p>
            </div>

            {/* Capabilities */}
            <ul className="space-y-3 text-xs sm:text-sm text-slate-700">
              {activeCard.bullets.map((bullet, bIdx) => (
                <li key={bIdx} className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-brand-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{bullet}</span>
                </li>
              ))}
            </ul>

            {activeCard.securityNote && (
              <div className="p-3 rounded-xl bg-white/80 border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
                <Lock className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>{activeCard.securityNote}</span>
              </div>
            )}

            {/* Card Action */}
            <div className="pt-2 space-y-3">
              <Button
                type="button"
                variant="default"
                size="lg"
                onClick={() => router.push(activeCard.href)}
                className="w-full gap-2 shadow-md font-bold"
              >
                {activeCard.ctaLabel}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <p className="text-center text-[11px] text-slate-500">
                Swipe horizontally or use arrows to browse roles ·{' '}
                <Link href="/login" className="font-semibold text-brand-600 hover:underline">
                  Already have an account?
                </Link>
              </p>
            </div>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Next role card"
          onClick={() => goToIndex(activeIndex + 1)}
          className="shrink-0 rounded-full h-10 w-10 shadow-sm bg-white hover:bg-brand-50"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Carousel Indicators */}
      <div className="flex items-center justify-center gap-2">
        {ROLE_CARDS.map((card, idx) => (
          <button
            key={card.id}
            type="button"
            aria-label={`Select ${card.title} card`}
            onClick={() => goToIndex(idx)}
            className={`h-2.5 rounded-full transition-all duration-200 ${
              idx === activeIndex ? 'w-8 bg-brand-600' : 'w-2.5 bg-slate-300 hover:bg-slate-400'
            }`}
          />
        ))}
      </div>

      <style jsx>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(24px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-24px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
