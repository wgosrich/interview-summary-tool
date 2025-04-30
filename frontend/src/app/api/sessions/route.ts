import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch("${process.env.NEXT_PUBLIC_API_URL}/get_all_sessions");

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch sessions from backend' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in sessions API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}