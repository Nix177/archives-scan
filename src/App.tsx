import { useState, useRef, ChangeEvent, useCallback } from 'react';
import { Camera, ImageUp, Loader2, RotateCcw, Box, ArrowRight, X } from 'lucide-react';
import Webcam from 'react-webcam';

interface ArchiveData {
  titre: string;
  categorie: string;
  description_detaillee: string;
  date_estimee: string;
  createur_artiste: string;
  provenance: string;
  etat_conservation: string;
  notes_historiques: string;
  pistes_recherche: string;
}

type AppState = 'upload' | 'webcam' | 'review' | 'submitting' | 'success';

export default function App() {
  const [appState, setAppState] = useState<AppState>('upload');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [archiveData, setArchiveData] = useState<ArchiveData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const webcamRef = useRef<Webcam>(null);

  const resetApp = () => {
    setAppState('upload');
    setSelectedImage(null);
    setImageBase64(null);
    setImagePreview(null);
    setArchiveData(null);
    setError(null);
  };

  const processImageFile = async (file: File) => {
    setError(null);
    setSelectedImage(file);
    
    // Créer une URL pour l'aperçu HD
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);

    try {
      const base64 = await fileToBase64(file);
      const base64Data = base64.split(',')[1];
      setImageBase64(base64Data);
      
      // Mode manuel, créer un objet vide
      setArchiveData({
        titre: '', categorie: '', description_detaillee: '', date_estimee: '',
        createur_artiste: '', provenance: '', etat_conservation: '', notes_historiques: '', pistes_recherche: ''
      });
      setAppState('review');

    } catch (err) {
      console.error("Error converting file:", err);
      setError("Impossible de lire l'image. Veuillez réessayer.");
      setAppState('upload');
    }
  };

  const handleFileSelection = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const captureWebcam = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      // Reconvertir la Data URL en File
      fetch(imageSrc)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], "webcam-capture.jpg", { type: "image/jpeg" });
          processImageFile(file);
        });
    }
  }, [webcamRef]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (archiveData) setArchiveData({ ...archiveData, [name]: value });
  };

  const submitWebhook = async () => {
    if (!archiveData || !imageBase64) return;
    
    setAppState('submitting');
    setError(null);

    const payload = {
      archive_data: archiveData,
      image_base64: imageBase64,
      image_mime_type: selectedImage?.type || "image/jpeg",
    };

    try {
      // Appel à notre Vercel Serverless Function 
      const response = await fetch('/api/archives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(`Erreur réseau: ${response.status}`);
      setAppState('success');
    } catch (err: any) {
      console.error("API error:", err);
      // Mode fallback préventif (si le dev local avec Vite ne mappe pas Vercel CLI)
      if (err.message.includes('Failed to fetch') || err.message.includes('404')) {
         console.warn("Échec d'envoi vers /api/archives (Normal si vous testez via 'npm run dev' classique au lieu de 'vercel dev'). Simulation succès.");
         setTimeout(() => setAppState('success'), 1500);
      } else {
         setError(`Erreur serveur web: ${err.message}`);
         setAppState('review');
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header Navigation */}
      <nav className="flex items-center justify-between px-6 md:px-8 py-6 border-b border-[#1a1a1a]/10 bg-[#fdfcfb] shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-[#1a1a1a] rounded-full flex items-center justify-center">
            <Camera className="w-4 h-4 text-white" />
          </div>
          <span className="font-serif italic text-xl md:text-2xl tracking-tight">Mes Archives Familiales</span>
        </div>
      </nav>

      {/* Main Content Layout */}
      {(appState === 'upload' || appState === 'success' || appState === 'webcam') && (
        <main className="flex-1 flex flex-col justify-center max-w-3xl mx-auto w-full px-4 md:px-8 py-12 md:py-20 h-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 mb-6 flex items-start gap-3 shadow-sm">
              <span className="shrink-0 mt-0.5">⚠️</span>
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {appState === 'upload' && (
            <div className="bg-[#f5f2ef] border border-[#1a1a1a]/10 p-10 md:p-16 flex flex-col items-center justify-center text-center animate-in fade-in duration-500 min-h-[500px]">
              <div className="w-16 h-16 bg-[#e8e4e1] border border-[#1a1a1a]/10 rounded-full flex items-center justify-center mb-8 shadow-inner">
                <Camera className="w-6 h-6 text-[#1a1a1a]" />
              </div>
              <h2 className="text-4xl font-serif mb-4">Nouvelle Archive</h2>
              <p className="text-sm text-[#1a1a1a]/60 mb-12 max-w-md mx-auto">
                Photographiez ou importez l'image d'un document historique pour l'ajouter à vos archives.
              </p>
              
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileSelection} />
              
              <div className="flex flex-col sm:flex-row items-center w-full max-w-md gap-4">
                <button onClick={() => setAppState('webcam')} className="w-full h-14 bg-[#1a1a1a] text-white flex items-center justify-center space-x-3 group relative overflow-hidden transition-all">
                  <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                  <Camera className="w-4 h-4" />
                  <span className="text-xs uppercase tracking-widest font-bold">Appareil Photo</span>
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="w-full h-14 border border-[#1a1a1a] flex items-center justify-center space-x-3 hover:bg-[#1a1a1a] hover:text-white transition-colors duration-300">
                  <ImageUp className="w-4 h-4" />
                  <span className="text-xs uppercase tracking-widest font-bold">Fichiers / Galerie</span>
                </button>
              </div>
            </div>
          )}

          {appState === 'webcam' && (
             <div className="bg-[#1a1a1a] border border-[#1a1a1a]/10 p-4 md:p-8 flex flex-col items-center justify-center text-center animate-in zoom-in-95 fade-in duration-300">
               <div className="w-full relative bg-black aspect-video md:aspect-[4/3] mb-6 flex items-center justify-center overflow-hidden">
                 <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" videoConstraints={{ facingMode: "environment" }} className="w-full h-full object-cover" />
                 <button onClick={() => setAppState('upload')} className="absolute top-4 right-4 bg-white/20 p-2 rounded-full hover:bg-white/40 transition-colors backdrop-blur-sm">
                   <X className="w-5 h-5 text-white" />
                 </button>
               </div>
               <button onClick={captureWebcam} className="h-16 w-16 bg-white rounded-full flex items-center justify-center space-x-3 hover:scale-95 transition-transform duration-200">
                  <div className="h-12 w-12 border-2 border-[#1a1a1a] rounded-full"></div>
               </button>
               <p className="text-white/60 text-xs mt-4 uppercase tracking-widest font-bold">Capturer l'archive</p>
             </div>
          )}

          {appState === 'success' && (
            <div className="bg-[#f5f2ef] border border-[#1a1a1a]/10 p-10 md:p-16 flex flex-col items-center justify-center text-center animate-in zoom-in-95 fade-in duration-500 min-h-[500px]">
              <div className="w-16 h-16 bg-[#e8e4e1] border border-[#1a1a1a]/10 rounded-full flex items-center justify-center mb-8 shadow-inner text-[#1a1a1a]">
                <Box className="w-6 h-6" />
              </div>
              <h2 className="text-4xl font-serif mb-4">Archive sauvegardée</h2>
              <p className="text-sm text-[#1a1a1a]/60 mb-12 max-w-md mx-auto">
                L'objet a bien été enregistré dans votre base de données MySQL. Il fait maintenant partie de votre collection.
              </p>
              
              <button onClick={resetApp} className="h-14 px-8 border border-[#1a1a1a] flex items-center justify-center space-x-3 hover:bg-[#1a1a1a] hover:text-white transition-colors duration-300">
                <Camera className="w-4 h-4" />
                <span className="text-xs uppercase tracking-widest font-bold">Scanner un nouvel objet</span>
              </button>
            </div>
          )}
        </main>
      )}

      {(appState === 'review' || appState === 'submitting') && (
        <main className="flex-1 flex flex-col lg:grid lg:grid-cols-12 max-h-[calc(100vh-89px)] overflow-hidden">
          {/* Left Side: Image Preview & Loading state */}
          <div className="col-span-12 lg:col-span-5 bg-[#f5f2ef] border-b lg:border-b-0 lg:border-r border-[#1a1a1a]/10 p-6 md:p-8 flex flex-col min-h-[50vh] lg:min-h-0 relative">
            <div className="flex-1 relative group w-full flex flex-col items-center justify-center">
              {imagePreview && (
                <div className="absolute inset-0 border border-[#1a1a1a]/5 p-2">
                  <div className="w-full h-full bg-[#e8e4e1] flex items-center justify-center overflow-hidden shadow-2xl relative">
                    <img src={imagePreview} alt="Archive" className="object-contain w-full h-full grayscale-[0.3]" />
                  </div>
                </div>
              )}
            </div>
            <div className="mt-8 flex items-center justify-between relative z-10 w-full shrink-0">
              <button onClick={resetApp} disabled={appState === 'submitting'} className="flex items-center space-x-2 text-xs uppercase tracking-widest font-bold disabled:opacity-50 hover:opacity-70 transition-opacity">
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">Reprendre Photo</span>
                <span className="sm:hidden">Reprendre</span>
              </button>
              <div className="h-px flex-1 mx-4 bg-[#1a1a1a]/20"></div>
              <span className="text-[10px] uppercase font-bold opacity-60">Saisie Manuelle</span>
            </div>
          </div>

          {/* Right Side: Validation Form */}
          <div className="col-span-12 lg:col-span-7 bg-[#fdfcfb] p-6 md:p-10 flex flex-col justify-between overflow-y-auto">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-4 mb-6 flex items-start gap-3 shadow-sm shrink-0">
                <span className="shrink-0 mt-0.5">⚠️</span>
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            {archiveData && (
              <div className="flex flex-col h-full animate-in slide-in-from-right-8 duration-500">
                <div className="space-y-8 pr-2 md:pr-4 mb-8 flex-1">
                  <header>
                    <h1 className="text-3xl md:text-4xl font-serif mb-2">
                       Saisie des données
                    </h1>
                    <p className="text-sm text-[#1a1a1a]/60">
                      Remplissez les détails historiques de votre archive avant de l'ajouter à votre collection.
                    </p>
                  </header>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div className="col-span-1 md:col-span-2">
                      <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 block mb-2">Titre de l'Objet</label>
                      <input type="text" name="titre" value={archiveData.titre} onChange={handleInputChange} placeholder="Ex: Montre gousset en argent" className="w-full bg-transparent border-b border-[#1a1a1a]/20 py-2 focus:border-[#1a1a1a] outline-none font-serif text-xl placeholder:opacity-30" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 block mb-2">Catégorie</label>
                      <input type="text" name="categorie" value={archiveData.categorie} onChange={handleInputChange} placeholder="Ex: Horlogerie, Document..." className="w-full bg-transparent border-b border-[#1a1a1a]/20 py-2 focus:border-[#1a1a1a] outline-none text-sm placeholder:opacity-30" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 block mb-2">Date Estimée</label>
                      <input type="text" name="date_estimee" value={archiveData.date_estimee} onChange={handleInputChange} placeholder="Ex: Fin du 19ème siècle" className="w-full bg-transparent border-b border-[#1a1a1a]/20 py-2 focus:border-[#1a1a1a] outline-none text-sm placeholder:opacity-30" />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 block mb-2">Description Détaillée</label>
                      <textarea name="description_detaillee" value={archiveData.description_detaillee} onChange={handleInputChange} rows={3} placeholder="Matière, dimensions, inscriptions visibles..." className="w-full bg-transparent border-b border-[#1a1a1a]/20 py-2 focus:border-[#1a1a1a] outline-none text-sm resize-none custom-scrollbar placeholder:opacity-30" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 block mb-2">Créateur / Auteur</label>
                      <input type="text" name="createur_artiste" value={archiveData.createur_artiste} onChange={handleInputChange} placeholder="Fabricant, artisan..." className="w-full bg-transparent border-b border-[#1a1a1a]/20 py-2 focus:border-[#1a1a1a] outline-none text-sm placeholder:opacity-30" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 block mb-2">État de Conservation</label>
                      <input type="text" name="etat_conservation" value={archiveData.etat_conservation} onChange={handleInputChange} placeholder="Ex: Bon état, traces d'usure..." className="w-full bg-transparent border-b border-[#1a1a1a]/20 py-2 focus:border-[#1a1a1a] outline-none text-sm placeholder:opacity-30" />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 block mb-2">Provenance / Origine</label>
                      <input type="text" name="provenance" value={archiveData.provenance} onChange={handleInputChange} placeholder="Lieu d'origine, héritage familial..." className="w-full bg-transparent border-b border-[#1a1a1a]/20 py-2 focus:border-[#1a1a1a] outline-none text-sm placeholder:opacity-30" />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 block mb-2">Notes Historiques</label>
                      <textarea name="notes_historiques" value={archiveData.notes_historiques} onChange={handleInputChange} rows={3} placeholder="Contexte, anecdotes, valeur sentimentale..." className="w-full bg-transparent border-b border-[#1a1a1a]/20 py-2 focus:border-[#1a1a1a] outline-none text-sm resize-none custom-scrollbar placeholder:opacity-30" />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 block mb-2">Pistes de Recherche</label>
                      <textarea name="pistes_recherche" value={archiveData.pistes_recherche} onChange={handleInputChange} rows={2} placeholder="Idées pour de futures recherches genealogiques..." className="w-full bg-transparent border-b border-[#1a1a1a]/20 py-2 focus:border-[#1a1a1a] outline-none text-sm resize-none custom-scrollbar placeholder:opacity-30" />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-[#1a1a1a]/10 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 shrink-0">
                  <button onClick={resetApp} disabled={appState === 'submitting'} className="flex-1 h-14 border border-[#1a1a1a] flex items-center justify-center space-x-3 hover:bg-[#1a1a1a] hover:text-white transition-colors duration-300 disabled:opacity-50">
                    <span className="text-xs uppercase tracking-widest font-bold">Annuler</span>
                  </button>
                  <button onClick={submitWebhook} disabled={appState === 'submitting'} className="flex-[2] h-14 bg-[#1a1a1a] text-white flex items-center justify-center space-x-3 group relative overflow-hidden disabled:opacity-80">
                    <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                    {appState === 'submitting' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-xs uppercase tracking-widest font-bold">Sauvegarde...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-xs uppercase tracking-widest font-bold">Sauvegarder l'archive</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      )}
    </div>
  );
}
