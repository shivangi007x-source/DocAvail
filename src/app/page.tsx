import React from 'react';
import { prisma } from '@/lib/prisma';
import { queryApprovedDoctors } from '@/lib/approvedDoctors';
import { queryFacilities } from '@/lib/facilityService';
import { HomeClient } from '@/components/home/HomeClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  const [initialDoctors, facilitiesResult] = await Promise.all([
    queryApprovedDoctors(),
    queryFacilities(prisma, { limit: 12 }),
  ]);

  return (
    <HomeClient
      initialDoctors={initialDoctors}
      initialFacilities={facilitiesResult.facilities}
    />
  );
}
