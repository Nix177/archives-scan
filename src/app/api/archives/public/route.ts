import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const archives = await db.all('SELECT * FROM archives WHERE is_public = 1 ORDER BY created_at DESC');
    return NextResponse.json(archives);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
