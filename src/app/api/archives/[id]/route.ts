import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUser } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    
    // We must await params in Next.js 15
    const awaitedParams = await params;
    const { id } = awaitedParams;
    
    const data = await req.json();
    const { is_public } = data;
    
    if (typeof is_public !== 'boolean') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const db = await getDb();
    
    // Ensure the archive belongs to the user
    const archive = await db.get('SELECT * FROM archives WHERE id = ? AND userId = ?', [id, user.id]);
    if (!archive) return NextResponse.json({ error: 'Archive non trouvée' }, { status: 404 });
    
    await db.run('UPDATE archives SET is_public = ? WHERE id = ?', [is_public ? 1 : 0, id]);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
