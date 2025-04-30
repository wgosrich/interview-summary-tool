import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const sessionId = request.nextUrl.pathname.split('/').pop();

  try {
    const body = await request.json();

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/create_chat/${sessionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: errorText }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in create chat API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}