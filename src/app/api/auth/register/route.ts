import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/lib/db';
import { hashPassword, generateToken } from '@/lib/simple-auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, github_username } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password and name are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existing = await client.execute({
      sql: `SELECT id FROM users WHERE email = ?`,
      args: [email],
    });

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Check if this is the first user
    const existingUsers = await client.execute({
      sql: `SELECT COUNT(*) as count FROM users`,
    });
    const isFirstUser = (existingUsers.rows[0] as any).count === 0;
    const role = isFirstUser ? 'admin' : 'developer';

    // Create user
    const result = await client.execute({
      sql: `INSERT INTO users (email, password, name, role, github_username) VALUES (?, ?, ?, ?, ?) RETURNING *`,
      args: [email, hashedPassword, name, role, github_username || null],
    });

    const user = result.rows[0] as any;

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        github_username: user.github_username,
      },
      token,
    });

    // Set cookie
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: error.message || 'Registration failed' },
      { status: 500 }
    );
  }
}
