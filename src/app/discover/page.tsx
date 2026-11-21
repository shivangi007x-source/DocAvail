import React, { Suspense } from 'react';
import { DiscoverClient } from '@/components/discover/DiscoverClient';
import { Card } from '@/components/ui/Card';

export const dynamic = 'force-dynamic';

function DiscoverFallback() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <Card className="p-8 text-center text-xs text-slate-500">
        Loading Jammu &amp; Kashmir healthcare discovery...
      </Card>
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={<DiscoverFallback />}>
      <DiscoverClient />
    </Suspense>
  );
}
