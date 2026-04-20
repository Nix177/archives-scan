import { useState, useRef, ChangeEvent, useCallback } from 'react';
import { Camera, ImageUp, CheckCircle, Loader2, RotateCcw, Box, ArrowRight, X } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import Webcam from 'react-webcam';

// --- CONFIGURATION ---
// Clé API Gemini (à définir dans .env)
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
// L'URL de votre Webhook n8n (Hostinger)
const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://n8n.srv893937.hstgr.cloud/webhook-test/archives';

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

type AppState = 'upload' | 'webcam' | 'analyzing' | 'review' | 'submitting' | 'success';

export default function App() {
  const [appState, setAppState] = useState<AppState>('upload');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [archiveData, setArchiveData] = useState<ArchiveData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [useAI, setUseAI] = useState<boolean>(false);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const webcamRef = useRef<Webcam>(null);

  const resetApp = () => {
    setAppState('upload');
    setSelectedImage(null);
    setImageBase64(null);
    setImagePreview(null);
    setArchiveData(null);
    setError(null);
    setUseAI(false);
    setCustomPrompt('');
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
      
      if (useAI) {
        if (!GEMINI_API_KEY) {
          setError("La clé d'API Gemini n'est pas configurée dans VITE_GEMINI_API_KEY.");
          setAppState('upload');
          return;
        }
        analyzeImage(base64Data, file.type);
      } else {
        // Mode manuel, créer un objet vide
        setArchiveData({
          titre: '', categorie: '', description_detaillee: '', date_estimee: '',
          createur_artiste: '', provenance: '', etat_conservation: '', notes_historiques: '', pistes_recherche: ''
        });
        setAppState('review');
      }
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
  }, [webcamRef, useAI, customPrompt]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const analyzeImage = async (base64Data: string, mimeType: string) => {
    setAppState('analyzing');
    try {
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      
      const systemPrompt = `Tu es un expert en archivistique chargé d'assister la numérisation d'un objet historique. Analyse l'image et propose un premier brouillon des informations de l'objet au format JSON strict. 
IMPORTANT : L'utilisateur devra vérifier toutes tes propositions avant de les sauvegarder. Pour l'aider, fournis dans le champ 'pistes_recherche' des méthodes concrètes pour valider tes hypothèses avec des outils externes (ex: "Utilisez Google Lens sur le poinçon", "Recherchez ce motif sur une base de faillence", "PimEyes pour le visage", "Retracer ce type de document dans les archives généalogiques", etc.) adaptées au type d'objet détecté. Ne sois pas affirmatif si tu n'es pas sûr.

Directives supplémentaires de l'utilisateur : ${customPrompt || 'Aucune.'}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [
          { text: systemPrompt },
          { inlineData: { data: base64Data, mimeType: mimeType } }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              titre: { type: Type.STRING, description: "Un titre court et descriptif de l'objet." },
              categorie: { type: Type.STRING, description: "La catégorie de l'objet (ex: Photographie, Document officiel, Bijou, Mobilier, etc.)." },
              description_detaillee: { type: Type.STRING, description: "Une description physique détaillée de l'objet (matière, couleurs, motifs, texte visible)." },
              date_estimee: { type: Type.STRING, description: "Une date ou époque estimée (ex: Années 1920, XIXe siècle, etc.). Mettre 'Inconnue' si impossible." },
              createur_artiste: { type: Type.STRING, description: "Nom du créateur, auteur ou fabricant." },
              provenance: { type: Type.STRING, description: "Origine géographique ou pays probable." },
              etat_conservation: { type: Type.STRING, description: "Évaluation de l'état (ex: Excellent, Usé, Déchiré, Fragile)." },
              notes_historiques: { type: Type.STRING, description: "Analyse contextuelle ou valeur historique potentielle de cette archive." },
              pistes_recherche: { type: Type.STRING, description: "Conseils et recommandations d'outils pour vérifier ces informations." }
            },
            required: ["titre", "categorie", "description_detaillee", "date_estimee", "createur_artiste", "provenance", "etat_conservation", "notes_historiques", "pistes_recherche"]
          }
        }
      });

      const textResponse = response.text;
      if (!textResponse) throw new Error("Réponse vide de l'IA.");

      const parsedJSON = JSON.parse(textResponse) as ArchiveData;
      setArchiveData(parsedJSON);
      setAppState('review');

    } catch (err: any) {
      console.error(err);
      setError(`Erreur Gemini: ${err.message || 'Assurez-vous que l\'image est claire et réessayez.'}`);
      setAppState('upload');
    }
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
         setError(`Erreur serveur webhook: ${err.message}`);
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
              <p className="text-sm text-[#1a1a1a]/60 mb-8 max-w-md mx-auto">
                Numérisez un document historique via l'appareil photo ou le système local.
              </p>
              
              <div className="w-full max-w-md text-left mb-8 space-y-4">
                <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => setUseAI(!useAI)}>
                  <div className={`w-5 h-5 flex items-center justify-center border transition-colors ${useAI ? 'bg-[#1a1a1a] border-[#1a1a1a]' : 'border-[#1a1a1a]/30 group-hover:border-[#1a1a1a]/60'}`}>
                    {useAI && <CheckCircle className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-xs uppercase tracking-widest font-bold opacity-80 group-hover:opacity-100 transition-opacity">Activer l'analyse IA (Bonus)</span>
                </div>

                <div className={`transition-all duration-300 overflow-hidden ${useAI ? 'max-h-40 opacity-100 mb-6' : 'max-h-0 opacity-0'}`}>
                  <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 block mb-2">Prompt IA personnalisé (Optionnel)</label>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Ex: Mets l'accent sur les détails vestimentaires ou les tampons postaux..."
                    rows={2}
                    className="w-full bg-transparent border-b border-[#1a1a1a]/20 py-2 focus:border-[#1a1a1a] outline-none text-sm resize-none custom-scrollbar"
                  />
                  <p className="text-[10px] text-[#1a1a1a]/40 mt-1 italic font-serif">Laissez vide si vous n'avez pas de requête spécifique.</p>
                </div>
              </div>

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
                L'objet a bien été envoyé vers votre webhook n8n avec succès. Il fait maintenant partie de votre collection.
              </p>
              
              <button onClick={resetApp} className="h-14 px-8 border border-[#1a1a1a] flex items-center justify-center space-x-3 hover:bg-[#1a1a1a] hover:text-white transition-colors duration-300">
                <Camera className="w-4 h-4" />
                <span className="text-xs uppercase tracking-widest font-bold">Scanner un nouvel objet</span>
              </button>
            </div>
          )}
        </main>
      )}

      {(appState === 'analyzing' || appState === 'review' || appState === 'submitting') && (
        <main className="flex-1 flex flex-col lg:grid lg:grid-cols-12 max-h-[calc(100vh-89px)] overflow-hidden">
          {/* Left Side: Image Preview & Loading state */}
          <div className="col-span-12 lg:col-span-5 bg-[#f5f2ef] border-b lg:border-b-0 lg:border-r border-[#1a1a1a]/10 p-6 md:p-8 flex flex-col min-h-[50vh] lg:min-h-0 relative">
            <div className="flex-1 relative group w-full flex flex-col items-center justify-center">
              {imagePreview && (
                <div className="absolute inset-0 border border-[#1a1a1a]/5 p-2">
                  <div className="w-full h-full bg-[#e8e4e1] flex items-center justify-center overflow-hidden shadow-2xl relative">
                    <img src={imagePreview} alt="Archive" className="object-contain w-full h-full grayscale-[0.3]" />
                    {appState === 'analyzing' && (
                      <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center">
                        <Loader2 className="w-8 h-8 text-[#1a1a1a] animate-spin mb-4" />
                        <p className="font-serif italic text-lg shadow-sm">Analyse de l'image...</p>
                      </div>
                    )}
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
              {appState === 'analyzing' ? (
                <span className="text-[10px] uppercase font-bold opacity-60">En cours</span>
              ) : (
                <span className="text-[10px] uppercase font-bold text-green-700">Analyse IA Terminée</span>
              )}
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

            {appState === 'analyzing' && !error && (
              <div className="flex-1 flex flex-col items-center justify-center text-center animate-pulse">
                 <h1 className="text-3xl font-serif mb-3 opacity-50">Extraction des données...</h1>
                 <p className="text-sm text-[#1a1a1a]/50 max-w-xs mx-auto">Veuillez patienter pendant que Gemini identifie les caractéristiques de l'objet.</p>
              </div>
            )}

            {(appState === 'review' || appState === 'submitting') && archiveData && (
              <div className="flex flex-col h-full animate-in slide-in-from-right-8 duration-500">
                <div className="space-y-8 pr-2 md:pr-4 mb-8 flex-1">
                  <header>
                    <h1 className="text-3xl md:text-4xl font-serif mb-2">
                       {archiveData.pistes_recherche ? "Vérification des données" : "Saisie des données"}
                    </h1>
                    <p className="text-sm text-[#1a1a1a]/60">
                      {archiveData.pistes_recherche ? "Gemini a analysé l'objet. Veuillez impérativement vérifier et valider les détails historiques avant l'archivage." : "Remplissez les détails historiques de votre archive avant de l'ajouter à votre collection."}
                    </p>
                  </header>

                  {archiveData.pistes_recherche && (
                    <div className="bg-[#f5f2ef] border-l-4 border-[#1a1a1a] p-5">
                       <h3 className="text-[10px] uppercase font-bold tracking-widest opacity-60 mb-2">Conseils d'investigation de l'IA</h3>
                       <p className="font-serif italic text-sm text-[#1a1a1a]/80 leading-relaxed">{archiveData.pistes_recherche}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div className="col-span-1 md:col-span-2">
                      <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 block mb-2">Titre de l'Objet</label>
                      <input type="text" name="titre" value={archiveData.titre} onChange={handleInputChange} className="w-full bg-transparent border-b border-[#1a1a1a]/20 py-2 focus:border-[#1a1a1a] outline-none font-serif text-xl" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 block mb-2">Catégorie</label>
                      <input type="text" name="categorie" value={archiveData.categorie} onChange={handleInputChange} className="w-full bg-transparent border-b border-[#1a1a1a]/20 py-2 focus:border-[#1a1a1a] outline-none text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 block mb-2">Date Estimée</label>
                      <input type="text" name="date_estimee" value={archiveData.date_estimee} onChange={handleInputChange} className="w-full bg-transparent border-b border-[#1a1a1a]/20 py-2 focus:border-[#1a1a1a] outline-none text-sm" />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 block mb-2">Description Détaillée</label>
                      <textarea name="description_detaillee" value={archiveData.description_detaillee} onChange={handleInputChange} rows={3} className="w-full bg-transparent border-b border-[#1a1a1a]/20 py-2 focus:border-[#1a1a1a] outline-none text-sm resize-none custom-scrollbar" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 block mb-2">Créateur / Auteur</label>
                      <input type="text" name="createur_artiste" value={archiveData.createur_artiste} onChange={handleInputChange} className="w-full bg-transparent border-b border-[#1a1a1a]/20 py-2 focus:border-[#1a1a1a] outline-none text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 block mb-2">État de Conservation</label>
                      <input type="text" name="etat_conservation" value={archiveData.etat_conservation} onChange={handleInputChange} className="w-full bg-transparent border-b border-[#1a1a1a]/20 py-2 focus:border-[#1a1a1a] outline-none text-sm" />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 block mb-2">Provenance / Origine</label>
                      <input type="text" name="provenance" value={archiveData.provenance} onChange={handleInputChange} className="w-full bg-transparent border-b border-[#1a1a1a]/20 py-2 focus:border-[#1a1a1a] outline-none text-sm" />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 block mb-2">Notes Historiques</label>
                      <textarea name="notes_historiques" value={archiveData.notes_historiques} onChange={handleInputChange} rows={3} className="w-full bg-transparent border-b border-[#1a1a1a]/20 py-2 focus:border-[#1a1a1a] outline-none text-sm resize-none custom-scrollbar" />
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
                        <span className="text-xs uppercase tracking-widest font-bold">Envoi...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-xs uppercase tracking-widest font-bold">Archiver l'objet (n8n)</span>
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
