import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'database.json');

// Interface that matches what we used for SQLite to not rewrite API routes
export async function getDb() {
  const readDb = () => {
    if (!fs.existsSync(dbPath)) {
      return { users: [], archives: [] };
    }
    const data = fs.readFileSync(dbPath, 'utf-8');
    return JSON.parse(data);
  };

  const writeDb = (data: any) => {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
  };

  return {
    get: async (query: string, params: any[] = []) => {
      const db = readDb();
      if (query.includes('FROM users')) {
        return db.users.find((u: any) => u.email === params[0]) || null;
      }
      if (query.includes('FROM archives WHERE id = ?')) {
        return db.archives.find((a: any) => a.id === params[0] && a.userId === params[1]) || null;
      }
      return null;
    },
    
    all: async (query: string, params: any[] = []) => {
      const db = readDb();
      if (query.includes('WHERE is_public = 1')) {
        return db.archives.filter((a: any) => a.is_public === 1).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }
      if (query.includes('WHERE userId = ?')) {
        return db.archives.filter((a: any) => a.userId === params[0]).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }
      return [];
    },
    
    run: async (query: string, params: any[] = []) => {
      const db = readDb();
      
      if (query.includes('INSERT INTO users')) {
        db.users.push({
          id: params[0],
          email: params[1],
          password: params[2]
        });
        writeDb(db);
      }
      else if (query.includes('INSERT INTO archives')) {
        db.archives.push({
          id: params[0],
          userId: params[1],
          titre: params[2],
          categorie: params[3],
          description_detaillee: params[4],
          date_estimee: params[5],
          createur_artiste: params[6],
          provenance: params[7],
          etat_conservation: params[8],
          notes_historiques: params[9],
          pistes_recherche: params[10],
          image_url: params[11],
          is_public: params[12],
          created_at: new Date().toISOString()
        });
        writeDb(db);
      }
      else if (query.includes('UPDATE archives SET is_public = ?')) {
        const index = db.archives.findIndex((a: any) => a.id === params[1]);
        if (index > -1) {
          db.archives[index].is_public = params[0];
          writeDb(db);
        }
      }
    }
  };
}
