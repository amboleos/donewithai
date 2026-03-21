import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/lib/db';

async function dropAllTables() {
  // Disable foreign key constraints temporarily
  await client.execute(`PRAGMA foreign_keys = OFF`);

  // Drop all tables (in specific order due to foreign keys, though FKs are disabled)
  await client.execute(`DROP TABLE IF EXISTS ai_detections`);
  await client.execute(`DROP TABLE IF EXISTS user_mappings`);
  await client.execute(`DROP TABLE IF EXISTS branches`);
  await client.execute(`DROP TABLE IF EXISTS commits`);
  await client.execute(`DROP TABLE IF EXISTS users`);
  await client.execute(`DROP TABLE IF EXISTS repos`);
  await client.execute(`DROP TABLE IF EXISTS ai_keywords`);
  await client.execute(`DROP TABLE IF EXISTS ai_jobs`);
  await client.execute(`DROP TABLE IF EXISTS ai_detection_queue`);
  await client.execute(`DROP TABLE IF EXISTS branch_commits`);

  // Re-enable foreign key constraints
  await client.execute(`PRAGMA foreign_keys = ON`);
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const force = searchParams.get('force') === 'true';

    if (force) {
      await dropAllTables();
    }

    // Import and call initDb
    const { initDb } = await import('@/lib/db');
    await initDb();

    return NextResponse.json({
      success: true,
      message: force
        ? 'Database reset and initialized successfully'
        : 'Database initialized successfully'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to initialize database' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const force = searchParams.get('force') === 'true';

    if (force) {
      await dropAllTables();
    }

    const { initDb } = await import('@/lib/db');
    await initDb();

    return NextResponse.json({
      success: true,
      message: force
        ? 'Database reset and initialized successfully'
        : 'Database initialized successfully'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to initialize database' },
      { status: 500 }
    );
  }
}
