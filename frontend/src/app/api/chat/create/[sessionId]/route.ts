import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  const { sessionId } = await params;
  
  try {
    const body = await request.json();
    
    const response = await fetch(`http://localhost:8000/create_chat/${sessionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to create chat' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in create chat API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 