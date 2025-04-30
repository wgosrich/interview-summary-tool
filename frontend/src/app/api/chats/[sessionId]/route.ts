import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.pathname.split('/').pop();

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/get_chats/${sessionId}`);

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch chats from backend' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in chats API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}