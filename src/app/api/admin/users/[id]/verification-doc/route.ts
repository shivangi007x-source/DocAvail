import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuthUser(req, ['ADMIN'], {
      forbiddenMessage: 'Forbidden. Administrator privileges required.',
    });
    if (!auth.ok) return auth.response;

    const doc = await prisma.doctorProfile.findUnique({
      where: { userId: params.id },
      select: {
        verificationDocName: true,
        verificationDocMime: true,
        verificationDocContent: true,
      },
    });

    if (!doc || !doc.verificationDocContent) {
      return NextResponse.json(
        { error: 'No supporting verification document was uploaded for this account.' },
        { status: 404 }
      );
    }

    const safeFileName = (doc.verificationDocName || 'verification-document').replace(
      /[^a-zA-Z0-9._-]/g,
      '_'
    );
    const bodyBytes = Buffer.from(doc.verificationDocContent);

    return new NextResponse(bodyBytes, {
      status: 200,
      headers: {
        'Content-Type': doc.verificationDocMime || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${safeFileName}"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Admin verification doc download error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve verification document' },
      { status: 500 }
    );
  }
}
