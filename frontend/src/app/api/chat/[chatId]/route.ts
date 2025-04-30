import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const chatId = request.nextUrl.pathname.split('/').pop();

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/load_chat/${chatId}`);

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to load chat from backend' },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (data.messages) {
      data.messages = data.messages.map((msg: any) => {
        if (typeof msg === 'string') {
          if (msg.startsWith('You:')) {
            return { role: 'user', content: msg.replace(/^You:\s*/, '') };
          } else if (msg.startsWith('Assistant:')) {
            return { role: 'assistant', content: msg.replace(/^Assistant:\s*/, '') };
          } else {
            return { role: 'unknown', content: msg };
          }
        }

        if (typeof msg === 'object' && msg.role && msg.content) {
          return msg;
        }

        return {
          role: 'unknown',
          content: typeof msg === 'object' ? JSON.stringify(msg) : String(msg || ''),
        };
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in load chat API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const chatId = request.nextUrl.pathname.split('/').pop();

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/delete_chat/${chatId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to delete chat' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in delete chat API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const chatId = request.nextUrl.pathname.split('/').pop();

  try {
    const body = await request.json();
    const { name } = body;

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/rename_chat/${chatId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to rename chat' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in rename chat API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}