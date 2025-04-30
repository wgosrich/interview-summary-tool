import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const pathParts = request.nextUrl.pathname.split('/');
    const userId = pathParts[3];
    const sessionId = pathParts[5];

    if (!userId || !sessionId) {
      return NextResponse.json(
        { error: 'User ID and Session ID are required' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `http://localhost:8000/subscribe/${userId}/${sessionId}`,
      {
        method: 'POST',
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to subscribe to session' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in subscribe to session API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 