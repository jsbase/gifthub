import { NextResponse } from 'next/server';

export const POST = async (): Promise<NextResponse> => {
  const response = NextResponse.json({ success: true });
  
  // Clear the auth cookie
  response.cookies.set({
    name: 'auth-token',
    value: '',
    expires: new Date(0),
    path: '/',
  });

  return response;
};
