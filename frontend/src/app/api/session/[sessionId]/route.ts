import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(request: NextRequest) {
  const sessionId = request.nextUrl.pathname.split('/').pop();

  try {
    const body = await request.json();

    const response = await fetch(`http://localhost:8000/rename_session/${sessionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to rename session' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in rename session API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}