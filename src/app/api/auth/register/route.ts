import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: 'Remplissez tous les champs' }, { status: 400 });
    
    const db = await getDb();
    const existing = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (existing) return NextResponse.json({ error: 'Cet email existe déjà' }, { status: 400 });
    
    const hashed = await bcrypt.hash(password, 10);
    const id = uuidv4();
    await db.run('INSERT INTO users (id, email, password) VALUES (?, ?, ?)', [id, email, hashed]);
    
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
