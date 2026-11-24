'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Lock,
  ShieldCheck,
  MapPin,
  Stethoscope,
} from 'lucide-react';
import {
  PatientIllustration,
  DoctorIllustration,
  AdministratorIllustration,
} from './RoleIllustrations';

interface RoleCardConfig {
  id: 'PATIENT' | 'DOCTOR' | 'ADMIN';
  roleLabel: string;
  badgeText: string;
  badgeVariant: 'available' | 'verified' | 'busy';
  heading: string;
  description: string;
  ctaLabel: string;
  href: string;
  illustrationBg: string;
  cardBorderHover: string;
  securityNote: string;
  securityIcon: 'patient' | 'doctor' | 'admin';
  illustration: React.ReactNode;
}

const ROLE_CARDS: RoleCardConfig[] = [
  {
    id: 'PATIENT',
    roleLabel: 'PATIENT',
    badgeText: 'Jammu & Kashmir Care Access',
    badgeVariant: 'available',
    heading: 'Find the care you deserve.',
    description: 'Discover verified doctors and healthcare facilities near you.',
    ctaLabel: 'Continue as Patient',
    href: '/register/patient',
    illustrationBg: 'from-brand-50 via-emerald-50/70 to-white',
    cardBorderHover: 'hover:border-brand-300',
    securityNote: 'Guided 4-step registration with J&K district discovery. Patient records remain private.',
    securityIcon: 'patient',
    illustration: <PatientIllustration className="w-full h-full max-w-[280px] mx-auto" />,
  },
  {
    id: 'DOCTOR',
    roleLabel: 'DOCTOR',
    badgeText: 'Verified Clinician Portal',
    badgeVariant: 'verified',
    heading: 'Make a difference.',
    description:
      'Build your professional profile and connect with patients across Jammu & Kashmir.',
    ctaLabel: 'Continue as Doctor',
    href: '/register/doctor',
    illustrationBg: 'from-brand-50 via-sky-50/70 to-white',
    cardBorderHover: 'hover:border-brand-300',
    securityNote:
      'Profiles require DocAvail administrator verification before appearing to patients.',
    securityIcon: 'doctor',
    illustration: <DoctorIllustration className="w-full h-full max-w-[280px] mx-auto" />,
  },
  {
    id: 'ADMIN',
    roleLabel: 'ADMINISTRATOR',
    badgeText: 'Restricted Governance',
    badgeVariant: 'busy',
    heading: 'Manage DocAvail.',
    description:
      'Manage registrations, verify healthcare professionals and oversee the platform.',
    ctaLabel: 'Administrator Access',
    href: '/admin-access',
    illustrationBg: 'from-slate-100 via-amber-50/50 to-white',
    cardBorderHover: 'hover:border-amber-300',
    securityNote:
      'Public administrator signup is disabled. Existing administrators sign in securely.',
    securityIcon: 'admin',
    illustration: <AdministratorIllustration className="w-full h-full max-w-[280px] mx-auto" />,
  },
];

const SLIDE_LOCK_MS = 280;
const SWIPE_THRESHOLD_PX = 48;

export function RoleFlashcards() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [navigatingHref, setNavigatingHref] = useState<string | null>(null);

  const dragStartRef = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    };
  }, []);

  const goToIndex = useCallback(
    (nextIdx: number) => {
      if (isLocked || navigatingHref) return;
      const clamped = Math.max(0, Math.min(ROLE_CARDS.length - 1, nextIdx));
      if (clamped === activeIndex) return;

      setIsLocked(true);
      setActiveIndex(clamped);
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
      lockTimerRef.current = setTimeout(() => {
        setIsLocked(false);
      }, SLIDE_LOCK_MS);
    },
    [activeIndex, isLocked, navigatingHref]
  );

  const handleContinue = (href: string, cardIdx: number) => {
    if (cardIdx !== activeIndex || navigatingHref) return;
    setNavigatingHref(href);
    router.push(href);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isLocked || navigatingHref) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('button, a')) return;

    dragStartRef.current = { x: e.clientX, y: e.clientY, pointerId: e.pointerId };
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current || !isDragging) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    // Ignore predominantly vertical scroll gestures
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaX) < 18) return;

    // Gentle resistance when pulling past first or last card
    const atStartPullingRight = activeIndex === 0 && deltaX > 0;
    const atEndPullingLeft = activeIndex === ROLE_CARDS.length - 1 && deltaX < 0;
    const damped = atStartPullingRight || atEndPullingLeft ? deltaX * 0.25 : deltaX;
    setDragOffset(Math.max(-160, Math.min(160, damped)));
  };

  const finishDrag = (clientX: number | null) => {
    if (!dragStartRef.current) {
      setIsDragging(false);
      setDragOffset(0);
      return;
    }

    const deltaX = clientX !== null ? clientX - dragStartRef.current.x : 0;
    dragStartRef.current = null;
    setIsDragging(false);
    setDragOffset(0);

    if (deltaX <= -SWIPE_THRESHOLD_PX) {
      goToIndex(activeIndex + 1);
    } else if (deltaX >= SWIPE_THRESHOLD_PX) {
      goToIndex(activeIndex - 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      goToIndex(activeIndex + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goToIndex(activeIndex - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      goToIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      goToIndex(ROLE_CARDS.length - 1);
    }
  };

  const isFirst = activeIndex === 0;
  const isLast = activeIndex === ROLE_CARDS.length - 1;
  const activeCard = ROLE_CARDS[activeIndex];

  return (
    <section
      aria-roledescription="carousel"
      aria-label="DocAvail role selection"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="space-y-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-3xl"
    >
      {/* Screen-reader live announcement */}
      <p className="sr-only" aria-live="polite">
        Card {activeIndex + 1} of {ROLE_CARDS.length}: {activeCard.roleLabel}. {activeCard.heading}
      </p>

      {/* Top Quick Role Indicator Pills (Desktop/Mobile click sync) */}
      <div className="flex items-center justify-center gap-2 flex-wrap" role="tablist" aria-label="Select role">
        {ROLE_CARDS.map((card, idx) => {
          const isActive = idx === activeIndex;
          return (
            <button
              key={card.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`role-slide-${card.id}`}
              onClick={() => goToIndex(idx)}
              disabled={isLocked || Boolean(navigatingHref)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all duration-200 border ${
                isActive
                  ? 'bg-brand-700 text-white border-brand-700 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300 hover:text-brand-700'
              }`}
            >
              {card.roleLabel}
            </button>
          );
        })}
      </div>

      {/* Main Carousel Stage */}
      <div className="relative max-w-xl mx-auto">
        {/* Previous Card Button */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Previous role card"
          aria-disabled={isFirst}
          disabled={isFirst || isLocked || Boolean(navigatingHref)}
          onClick={() => goToIndex(activeIndex - 1)}
          className={`absolute left-2 sm:-left-14 top-24 sm:top-1/2 sm:-translate-y-1/2 z-20 h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-white/95 backdrop-blur border-slate-200 shadow-md transition-all ${
            isFirst
              ? 'opacity-40 cursor-not-allowed'
              : 'hover:bg-brand-50 hover:border-brand-300 hover:text-brand-700'
          }`}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        {/* Next Card Button */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Next role card"
          aria-disabled={isLast}
          disabled={isLast || isLocked || Boolean(navigatingHref)}
          onClick={() => goToIndex(activeIndex + 1)}
          className={`absolute right-2 sm:-right-14 top-24 sm:top-1/2 sm:-translate-y-1/2 z-20 h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-white/95 backdrop-blur border-slate-200 shadow-md transition-all ${
            isLast
              ? 'opacity-40 cursor-not-allowed'
              : 'hover:bg-brand-50 hover:border-brand-300 hover:text-brand-700'
          }`}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>

        {/* Single-Card Viewport Window */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={(e) => finishDrag(e.clientX)}
          onPointerCancel={() => finishDrag(null)}
          onPointerLeave={(e) => {
            if (isDragging) finishDrag(e.clientX);
          }}
          className="overflow-hidden rounded-[2rem] shadow-xl shadow-slate-200/70 touch-pan-y select-none cursor-grab active:cursor-grabbing"
        >
          {/* Horizontal Sliding Track */}
          <div
            style={{
              transform: `translate3d(calc(-${activeIndex * 100}% + ${dragOffset}px), 0, 0)`,
            }}
            className={`flex items-stretch ${
              isDragging
                ? 'transition-none'
                : 'transition-transform duration-300 ease-out motion-reduce:transition-none'
            }`}
          >
            {ROLE_CARDS.map((card, idx) => {
              const isCurrent = idx === activeIndex;
              return (
                <article
                  key={card.id}
                  id={`role-slide-${card.id}`}
                  aria-hidden={!isCurrent}
                  className={`w-full shrink-0 flex flex-col justify-between bg-white border border-slate-200/90 rounded-[2rem] overflow-hidden ${card.cardBorderHover}`}
                >
                  {/* Illustration Header Panel */}
                  <div
                    className={`relative bg-gradient-to-br ${card.illustrationBg} px-6 pt-6 pb-4 border-b border-slate-100`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-brand-700">
                        {card.roleLabel}
                      </span>
                      <Badge variant={card.badgeVariant} className="text-[10px]">
                        {card.badgeText}
                      </Badge>
                    </div>

                    <div className="h-44 sm:h-48 flex items-center justify-center">
                      {card.illustration}
                    </div>
                  </div>

                  {/* Card Body & Action */}
                  <div className="flex-1 flex flex-col justify-between p-6 sm:p-8 space-y-6 bg-white">
                    <div className="space-y-3 text-center sm:text-left">
                      <h2 className="text-2xl sm:text-[1.75rem] font-extrabold text-slate-900 tracking-tight leading-tight">
                        {card.heading}
                      </h2>
                      <p className="text-sm sm:text-base text-slate-600 leading-relaxed min-h-[3rem]">
                        {card.description}
                      </p>
                    </div>

                    <div className="space-y-4">
                      {/* Security / Workflow Micro-Banner */}
                      <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600">
                        {card.securityIcon === 'patient' && (
                          <MapPin className="h-4 w-4 text-brand-600 shrink-0 mt-0.5" />
                        )}
                        {card.securityIcon === 'doctor' && (
                          <Stethoscope className="h-4 w-4 text-brand-600 shrink-0 mt-0.5" />
                        )}
                        {card.securityIcon === 'admin' && (
                          <Lock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        )}
                        <span className="leading-snug">{card.securityNote}</span>
                      </div>

                      <Button
                        type="button"
                        variant="default"
                        size="lg"
                        disabled={Boolean(navigatingHref)}
                        tabIndex={isCurrent ? 0 : -1}
                        onClick={() => handleContinue(card.href, idx)}
                        className={`w-full h-12 text-sm sm:text-base font-bold rounded-xl shadow-md gap-2 transition-all ${
                          card.id === 'ADMIN'
                            ? 'bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950'
                            : ''
                        }`}
                      >
                        {navigatingHref === card.href ? (
                          'Opening...'
                        ) : (
                          <>
                            {card.id === 'ADMIN' && <ShieldCheck className="h-4 w-4" />}
                            {card.ctaLabel}
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>

      {/* Three Pagination Dots & Helper Caption */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center justify-center gap-2.5" aria-label="Role cards pagination">
          {ROLE_CARDS.map((card, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={card.id}
                type="button"
                aria-label={`Go to ${card.roleLabel} card (${idx + 1} of ${ROLE_CARDS.length})`}
                aria-current={isActive ? 'step' : undefined}
                disabled={isLocked || Boolean(navigatingHref)}
                onClick={() => goToIndex(idx)}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  isActive
                    ? 'w-9 bg-brand-600 shadow-sm'
                    : 'w-2.5 bg-slate-300 hover:bg-brand-300'
                }`}
              />
            );
          })}
        </div>
        <p className="text-xs text-slate-500 text-center">
          Swipe left or right, use arrow keys, or tap a dot ·{' '}
          <Link href="/login" className="font-semibold text-brand-700 hover:underline">
            Already have an account?
          </Link>
        </p>
      </div>
    </section>
  );
}
