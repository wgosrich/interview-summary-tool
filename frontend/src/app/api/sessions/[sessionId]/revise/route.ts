import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.pathname.split('/')[3];
    const body = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    if (!body.revision) {
      return NextResponse.json(
        { error: 'Revision request is required' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/revise/${sessionId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          revision: body.revision,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: errorText }, { status: response.status });
    }

    // Create a stream from the backend response
    const backendStream = response.body;
    
    // Create a new TransformStream
    const { readable, writable } = new TransformStream();
    
    // Pipe the backend stream to the transform stream
    if (backendStream) {
      const reader = backendStream.getReader();
      const writer = writable.getWriter();
      
      const pump = async () => {
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) {
              await writer.close();
              break;
            }
            await writer.write(value);
          }
        } catch (e) {
          console.error('Error streaming response:', e);
          writer.abort(e);
        }
      };
      
      pump();
    }
    
    // Return the readable stream in the NextResponse
    return new NextResponse(readable);
  } catch (error) {
    console.error('Error in revise API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 