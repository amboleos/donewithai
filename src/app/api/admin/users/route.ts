import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/simple-auth';
import { hashPassword } from '@/lib/simple-auth';
import { getAllUsers, createUser, getUserByEmail, ROLES } from '@/lib/db';

// GET - List all users
export async function GET(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  const payload = verifyToken(token || '');
  if (!payload || payload.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const users = await getAllUsers();
  return NextResponse.json({ users });
}

// POST - Create new user
export async function POST(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  const payload = verifyToken(token || '');
  if (!payload || payload.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, email, password, role, github_username } = body;

    // Validation
    if (!name?.trim() || !email?.trim() || !password?.trim() || !role) {
      return NextResponse.json(
        { error: 'Name, email, role and password are required' },
        { status: 400 }
      );
    }

    if (role !== ROLES.ADMIN && role !== ROLES.DEVELOPER) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Check for existing email
    const existing = await getUserByEmail(email.trim().toLowerCase());
    if (existing) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password);
    const user = await createUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role,
      github_username: github_username?.trim() || null,
    });

    // Return public user (without password)
    const { password: _, ...publicUser } = user;
    return NextResponse.json({ user: publicUser }, { status: 201 });
  } catch (error: any) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
