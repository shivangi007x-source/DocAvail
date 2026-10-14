'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Activity, Search, Calendar, User as UserIcon, LogOut, Menu, X, Stethoscope, ShieldCheck } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          
          {/* Logo Brand */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="h-10 w-10 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-md group-hover:bg-brand-700 transition-colors">
              <Activity className="h-6 w-6 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900 group-hover:text-brand-600 transition-colors">
                Doc<span className="text-brand-600">Avail</span>
              </span>
              <span className="hidden sm:inline-block text-[10px] font-semibold text-slate-400 block -mt-1 tracking-wider uppercase">
                Real-Time Availability
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <Link href="/doctors" className="flex items-center gap-1.5 hover:text-brand-600 transition-colors">
              <Search className="h-4 w-4" />
              Find Doctors
            </Link>
            
            {user?.role === 'PATIENT' && (
              <Link href="/patient/dashboard" className="flex items-center gap-1.5 text-brand-700 font-semibold hover:text-brand-800">
                <Calendar className="h-4 w-4" />
                Patient Portal
              </Link>
            )}

            {user?.role === 'DOCTOR' && (
              <Link href="/doctor/dashboard" className="flex items-center gap-1.5 text-brand-700 font-semibold hover:text-brand-800">
                <Stethoscope className="h-4 w-4" />
                Doctor Portal
              </Link>
            )}

            {user?.role === 'ADMIN' && (
              <Link href="/admin" className="flex items-center gap-1.5 text-amber-700 font-semibold hover:text-amber-800">
                <ShieldCheck className="h-4 w-4" />
                Admin Panel
              </Link>
            )}
          </nav>

          {/* Auth Action Buttons / User Menu */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3 bg-slate-50 p-1.5 pl-3 rounded-xl border border-slate-200">
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-900 leading-tight">{user.name}</p>
                  <div className="flex items-center justify-end gap-1">
                    <Badge variant="brand" className="text-[10px] py-0 px-1.5">
                      {user.role}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg p-2"
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="gap-1.5">
                    <UserIcon className="h-4 w-4" />
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant="default" size="sm" className="shadow-sm">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-6 space-y-3 animate-in slide-in-from-top duration-200">
          <Link
            href="/doctors"
            className="flex items-center gap-2 py-2 px-3 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={() => setMobileMenuOpen(false)}
          >
            <Search className="h-4 w-4 text-brand-600" />
            Find Doctors
          </Link>
          {user ? (
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="px-3 py-2 bg-slate-50 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-900">{user.name}</p>
                  <p className="text-[10px] text-slate-500">{user.email}</p>
                </div>
                <Badge variant="brand">{user.role}</Badge>
              </div>
              <Button
                variant="outline"
                className="w-full text-rose-600 border-rose-200 hover:bg-rose-50"
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
              >
                Sign Out
              </Button>
            </div>
          ) : (
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full">
                  Sign In
                </Button>
              </Link>
              <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="default" className="w-full">
                  Register Account
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
