import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(request: NextRequest) {
  const pathParts = request.nextUrl.pathname.split('/');
  const userId = pathParts[3];
  const sessionId = pathParts[5];

  if (!userId || !sessionId) {
    return NextResponse.json(
      { error: 'User ID and Session ID are required' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/unsubscribe/${userId}/${sessionId}`,
      {
        method: 'DELETE',
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: errorText }, { status: response.status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in unsubscribe from session API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}