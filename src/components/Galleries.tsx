"use client";

import { useEffect, useState } from 'react';
import { Camera, ImageUp, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';

interface Archive {
  id: string;
  titre: string;
  categorie: string;
  image_url: string;
  is_public: number;
  created_at: string;
  notes_historiques: string;
  date_estimee: string;
}

export function Galleries({ section, onNavigate }: { section: 'my-gallery' | 'public-gallery', onNavigate: (page: string) => void }) {
  const [archives, setArchives] = useState<Archive[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArchives();
  }, [section]);

  const fetchArchives = async () => {
    setLoading(true);
    const url = section === 'my-gallery' ? '/api/archives' : '/api/archives/public';
    try {
      const res = await fetch(url);
      const data = await res.json();
      setArchives(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const togglePublicStatus = async (id: string, currentStatus: number) => {
    try {
      const res = await fetch(`/api/archives/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_public: currentStatus === 1 ? false : true })
      });
      if (res.ok) {
        setArchives(prev => prev.map(a => a.id === id ? { ...a, is_public: currentStatus === 1 ? 0 : 1 } : a));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row items-center justify-between mb-12 border-b border-[#1a1a1a]/10 pb-6">
        <div>
          <h2 className="text-4xl font-serif mb-2">
            {section === 'my-gallery' ? "Ma Collection" : "La Galerie Publique"}
          </h2>
          <p className="text-[#1a1a1a]/60 text-sm">
            {section === 'my-gallery' 
              ? "Vos archives scannées et stockées de façon sécurisée."
              : "Découvrez les archives partagées par les autres utilisateurs de la plateforme."}
          </p>
        </div>
        
        <button 
          onClick={() => onNavigate('upload')}
          className="mt-6 md:mt-0 px-6 h-12 bg-[#1a1a1a] text-white flex items-center justify-center space-x-2 group hover:bg-black transition-all"
        >
          <Camera className="w-4 h-4" />
          <span className="text-xs uppercase tracking-widest font-bold">Nouvelle Archive</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-8 h-8 animate-spin opacity-50" />
        </div>
      ) : archives.length === 0 ? (
        <div className="text-center py-20 bg-[#f5f2ef] border border-[#1a1a1a]/5">
          <p className="font-serif italic text-lg opacity-50">Aucune archive trouvée.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {archives.map(archive => (
            <div key={archive.id} className="group bg-white border border-[#1a1a1a]/10 overflow-hidden flex flex-col slide-in-from-bottom-4 animate-in duration-500">
              <div className="relative aspect-square bg-[#f5f2ef] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={archive.image_url} 
                  alt={archive.titre}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                
                {section === 'my-gallery' && (
                  <div className="absolute top-3 right-3">
                    <button 
                      onClick={(e) => { e.stopPropagation(); togglePublicStatus(archive.id, archive.is_public) }}
                      className={`text-[9px] uppercase tracking-wider font-bold px-2 py-1 shadow-sm transition-colors ${archive.is_public ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
                    >
                      {archive.is_public ? 'Public' : 'Privé'}
                    </button>
                  </div>
                )}
              </div>
              
              <div className="p-5 flex-1 flex flex-col">
                <span className="text-[10px] uppercase font-bold tracking-widest opacity-40 mb-1 leading-none">{archive.categorie}</span>
                <h3 className="font-serif text-lg leading-tight mb-2 line-clamp-2" title={archive.titre}>{archive.titre}</h3>
                
                <p className="text-xs opacity-60 mb-4 line-clamp-3 flex-1">{archive.notes_historiques || archive.date_estimee}</p>
                
                <div className="pt-4 border-t border-[#1a1a1a]/5 mt-auto flex justify-between items-center text-[10px] uppercase tracking-wider opacity-40">
                  <span>{new Date(archive.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
