import { PrismaClient } from '@prisma/client';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// On initialise le client Prisma en dehors de la fonction métier 
// pour réutiliser la connexion entre les appels Serverless à chaud.
const prisma = new PrismaClient();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Basics pour Vercel (si appelé depuis un autre domaine)
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée. POST attendu.' });
  }

  try {
    const { archive_data, image_base64 } = req.body;

    if (!archive_data) {
      return res.status(400).json({ error: 'Champs archive_data manquants.' });
    }

    // Sauvegarde en base de données via Prisma
    const newArchive = await prisma.archive.create({
      data: {
        titre: archive_data.titre || "Sans titre",
        categorie: archive_data.categorie || "",
        description_detaillee: archive_data.description_detaillee || "",
        date_estimee: archive_data.date_estimee || "",
        createur_artiste: archive_data.createur_artiste || "",
        provenance: archive_data.provenance || "",
        etat_conservation: archive_data.etat_conservation || "",
        notes_historiques: archive_data.notes_historiques || "",
        pistes_recherche: archive_data.pistes_recherche || "",
        // Attention : stocker du base64 dans la BDD sature vite.
        // Si vous basculez vers S3/Hostinger Uploads, insérez l'URL web ici.
        imageUrl: image_base64, 
      },
    });

    return res.status(200).json({ 
      success: true, 
      message: 'Archive sauvegardée avec succès sur MySQL.',
      archive: newArchive 
    });

  } catch (error: any) {
    console.error('Erreur Serveur/Prisma :', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erreur interne du serveur lors de la sauvegarde.',
      details: error.message
    });
  }
}
