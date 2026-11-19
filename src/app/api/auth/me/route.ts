import { NextResponse } from 'next/server';
import { getSessionUser, TOKEN_COOKIE_NAME } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getSessionUser();

    if (!user) {
      const response = NextResponse.json({ user: null }, { status: 200 });
      response.cookies.set(TOKEN_COOKIE_NAME, '', { maxAge: 0, path: '/' });
      return response;
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error('Session user fetch error:', error);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
