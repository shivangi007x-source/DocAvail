import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { ShieldAlert, ArrowLeft, Clock3, XCircle } from 'lucide-react';

export default function UnauthorizedPage({
  searchParams,
}: {
  searchParams?: { status?: string };
}) {
  const status = searchParams?.status?.toLowerCase();
  const isPending = status === 'pending';
  const isRejected = status === 'rejected';

  const title = isPending
    ? 'Account Awaiting Approval'
    : isRejected
      ? 'Account Registration Rejected'
      : 'Access Restricted';

  const description = isPending
    ? 'Your account registration has been received and is currently awaiting administrator approval. Portal access will unlock once an admin approves your account.'
    : isRejected
      ? 'Your account registration was rejected by a DocAvail administrator and cannot access protected patient or doctor portals.'
      : 'You do not have permission to access this portal with your current role. Please sign in with the appropriate account privileges.';

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full text-center space-y-6 bg-white p-8 rounded-2xl border border-slate-200 shadow-xl">
        <div
          className={`h-16 w-16 rounded-full flex items-center justify-center mx-auto ${
            isPending
              ? 'bg-amber-100 text-amber-600'
              : 'bg-rose-100 text-rose-600'
          }`}
        >
          {isPending ? (
            <Clock3 className="h-8 w-8" />
          ) : isRejected ? (
            <XCircle className="h-8 w-8" />
          ) : (
            <ShieldAlert className="h-8 w-8" />
          )}
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-slate-900">{title}</h1>
          <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
        </div>
        <div className="pt-2 flex flex-col gap-2">
          <Link href="/">
            <Button variant="default" className="w-full gap-2">
              <ArrowLeft className="h-4 w-4" />
              Return to Home
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" className="w-full">
              Switch Account / Sign In
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
