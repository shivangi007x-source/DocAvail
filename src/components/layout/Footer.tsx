import React from 'react';
import Link from 'next/link';
import { Activity, ShieldCheck, Heart, PhoneCall } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-200 bg-slate-900 text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-brand-500 flex items-center justify-center text-white">
                <Activity className="h-5 w-5 stroke-[2.5]" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">
                Doc<span className="text-brand-400">Avail</span>
              </span>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed">
              Real-time doctor availability and clinic slot tracking. Know before you travel.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>Verified Medical Practitioner Network</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">
              For Patients
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="/doctors" className="hover:text-white transition-colors">
                  Find Available Doctors
                </Link>
              </li>
              <li>
                <Link href="/patient/medical-history" className="hover:text-white transition-colors">
                  My Medical History
                </Link>
              </li>
              <li>
                <Link href="/patient/appointments" className="hover:text-white transition-colors">
                  Appointment Tracker
                </Link>
              </li>
            </ul>
          </div>

          {/* Doctor Portal */}
          <div>
            <h4 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">
              For Healthcare Providers
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="/register?role=doctor" className="hover:text-white transition-colors">
                  Join DocAvail Network
                </Link>
              </li>
              <li>
                <Link href="/doctor/dashboard" className="hover:text-white transition-colors">
                  Manage Live Availability
                </Link>
              </li>
              <li>
                <Link href="/doctor/patients" className="hover:text-white transition-colors">
                  Patient Records Management
                </Link>
              </li>
              <li>
                <Link href="/doctor/schedule" className="hover:text-white transition-colors">
                  Working Hours & Slots Setup
                </Link>
              </li>
            </ul>
          </div>

          {/* Emergency Notice */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white tracking-wider uppercase">
              Emergency Contact
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              DocAvail is for scheduled and real-time consultation requests. If you are experiencing a life-threatening medical emergency, call emergency services immediately.
            </p>
            <div className="flex items-center gap-2 text-rose-400 text-xs font-bold bg-rose-950/40 p-2.5 rounded-lg border border-rose-900/50">
              <PhoneCall className="h-4 w-4 shrink-0" />
              <span>Emergency Services: 911 / 112</span>
            </div>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} DocAvail Real-Time Platform. All rights reserved.</p>
          <div className="flex items-center gap-1">
            <span>Built with care for patients & doctors</span>
            <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500 ml-1" />
          </div>
        </div>
      </div>
    </footer>
  );
};
