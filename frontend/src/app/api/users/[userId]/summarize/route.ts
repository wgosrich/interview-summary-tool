import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const userId = request.nextUrl.pathname.split('/')[3];

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // The request should be a FormData object with files
    const formData = await request.formData();
    
    // Validate that required files are present
    if (!formData.get('transcript') || !formData.get('recording')) {
      return NextResponse.json(
        { error: 'Transcript and recording files are required' },
        { status: 400 }
      );
    }

    // Forward the FormData to the backend API
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/summarize/${userId}`,
      {
        method: 'POST',
        body: formData,
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
    console.error('Error in summarize API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 