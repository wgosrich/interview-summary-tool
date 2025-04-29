import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { chatId: string } }
) {
  const chatId = params.chatId;
  
  try {
    const response = await fetch(`http://localhost:8000/load_chat/${chatId}`);
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to load chat from backend' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in load chat API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { chatId: string } }
) {
  const chatId = params.chatId;
  
  try {
    const response = await fetch(`http://localhost:8000/delete_chat/${chatId}`, {
      method: 'DELETE'
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { chatId: string } }
) {
  const chatId = params.chatId;
  
  try {
    const body = await request.json();
    const { name } = body;
    
    const response = await fetch(`http://localhost:8000/rename_chat/${chatId}`, {
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 