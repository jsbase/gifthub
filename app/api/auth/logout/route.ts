import { NextResponse } from 'next/server';

export const POST: () => Promise<NextResponse> = async () => {
  const response = NextResponse.json({ success: true });

  // Clear auth-token in cookie
  response.cookies.set({
    name: 'auth-token',
    value: '',
    expires: new Date(0),
    path: '/',
  });

  return response;
};
