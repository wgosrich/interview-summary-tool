import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  const sessionId = params.sessionId;
  
  try {
    const response = await fetch(`http://localhost:8000/get_chats/${sessionId}`);
    
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 