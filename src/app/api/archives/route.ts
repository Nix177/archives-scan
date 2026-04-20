import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '@/lib/db';
import { getUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  
  const db = await getDb();
  // We use user.id to get the current user's archives
  const archives = await db.all('SELECT * FROM archives WHERE userId = ? ORDER BY created_at DESC', [user.id]);
  return NextResponse.json(archives);
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    
    const data = await req.json();
    const { archive_data, image_base64, image_mime_type, is_public } = data;
    
    // SECURITY: Strict File Type Validation (Prevent PHP/Shell injections)
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const safeMimeType = allowedMimeTypes.includes(image_mime_type) ? image_mime_type : 'image/jpeg';
    const extension = safeMimeType === 'image/jpeg' ? 'jpg' : safeMimeType.split('/')[1];

    // SECURITY: Generate a totally randomized and safe filename (Prevent Path Traversal)
    const filename = `archive_${Date.now()}_${uuidv4().split('-')[0]}.${extension}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // SECURITY: Check payload size conceptually (base64 should be converted)
    const buffer = Buffer.from(image_base64, 'base64');
    
    // Limit to ~10MB (10 * 1024 * 1024 bytes)
    if (buffer.length > 10485760) {
       return NextResponse.json({ error: 'Fichier trop volumineux (10MB max)' }, { status: 400 });
    }

    fs.writeFileSync(path.join(uploadDir, filename), buffer);
    
    const imageUrl = `/uploads/${filename}`;
    const fullImageUrl = req.nextUrl.origin + imageUrl; 

    // Save to SQLite
    const db = await getDb();
    const id = uuidv4();
    await db.run(
      `INSERT INTO archives (
        id, userId, titre, categorie, description_detaillee, date_estimee, 
        createur_artiste, provenance, etat_conservation, notes_historiques, pistes_recherche, image_url, is_public
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, user.id, archive_data.titre, archive_data.categorie, archive_data.description_detaillee,
        archive_data.date_estimee, archive_data.createur_artiste, archive_data.provenance,
        archive_data.etat_conservation, archive_data.notes_historiques, archive_data.pistes_recherche,
        imageUrl,
        is_public ? 1 : 0
      ]
    );

    // Call user's n8n webhook
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    if (webhookUrl && !webhookUrl.includes('example.com')) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            archive_data,
            image_url: fullImageUrl, 
            timestamp: new Date().toISOString()
          })
        });
      } catch (e) {
        console.error('N8n webhook failed', e);
      }
    }

    return NextResponse.json({ success: true, id, imageUrl });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur lors de la sauvegarde' }, { status: 500 });
  }
}
