import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server-auth';
import { ROLES } from '@/lib/db';
import { getAIKeywords, createAIKeyword, deleteAIKeyword, toggleAIKeyword } from '@/lib/db';
import { invalidateKeywordCache } from '@/lib/ai-keywords';

// GET - List all keywords
export async function GET(req: NextRequest) {
  const session = await getServerSession(req);
  if (!session || session.user.role !== ROLES.ADMIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const keywords = await getAIKeywords();
  return NextResponse.json({ keywords });
}

// POST - Add new keyword
export async function POST(req: NextRequest) {
  const session = await getServerSession(req);
  if (!session || session.user.role !== ROLES.ADMIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { keyword } = await req.json();

    if (!keyword || typeof keyword !== 'string') {
      return NextResponse.json({ error: 'Keyword is required' }, { status: 400 });
    }

    const trimmed = keyword.trim().toLowerCase();
    if (trimmed.length < 2) {
      return NextResponse.json({ error: 'Keyword must be at least 2 characters' }, { status: 400 });
    }

    const newKeyword = await createAIKeyword(trimmed);
    invalidateKeywordCache();

    return NextResponse.json({ keyword: newKeyword });
  } catch (error: any) {
    if (error.message?.includes('UNIQUE')) {
      return NextResponse.json({ error: 'Keyword already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Remove keyword
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(req);
  if (!session || session.user.role !== ROLES.ADMIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get('id') || '');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await deleteAIKeyword(id);
    invalidateKeywordCache();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Toggle keyword active status
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(req);
  if (!session || session.user.role !== ROLES.ADMIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, isActive } = await req.json();

    if (typeof id !== 'number' || typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    await toggleAIKeyword(id, isActive);
    invalidateKeywordCache();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
