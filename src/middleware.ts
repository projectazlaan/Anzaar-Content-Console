import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/request';

export function middleware(request: NextRequest) {
  // This is a placeholder as Firebase Auth is client-side by default.
  // In a real production Next.js app, we would use Firebase Admin SDK
  // with session cookies for server-side protection.
  // For now, we will rely on our Client-side AuthGuard.
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|login).*)'],
};
