"use client";

import { useEffect, useState } from 'react';
import { Camera, ImageUp, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';

interface AuthProps {
  onLogin: () => void;
}

export function AuthScreen({ onLogin }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur inconnue');

      if (!isLogin) {
        // Automatically login after register
        setIsLogin(true);
        setError("Compte créé avec succès ! Veuillez vous connecter.");
        setLoading(false);
        return;
      }

      onLogin();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfcfb] text-[#1a1a1a] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#f5f2ef] border border-[#1a1a1a]/10 p-8 md:p-12 animate-in fade-in zoom-in-95 duration-500">
        <div className="w-12 h-12 bg-[#1a1a1a] rounded-full flex items-center justify-center mx-auto mb-6">
          <Camera className="w-5 h-5 text-white" />
        </div>
        
        <h1 className="text-3xl font-serif text-center mb-2">
          {isLogin ? "Connexion" : "Créer un compte"}
        </h1>
        <p className="text-center text-[#1a1a1a]/60 text-sm mb-8">
          Accédez à vos archives familiales personnelles.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-3 mb-6 flex text-sm shadow-sm gap-2 whitespace-pre-wrap text-center justify-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 block mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
              <input 
                type="email" 
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-transparent border-b border-[#1a1a1a]/20 py-2 pl-7 focus:border-[#1a1a1a] outline-none text-sm font-sans"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 block mb-2">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
              <input 
                type="password" 
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-transparent border-b border-[#1a1a1a]/20 py-2 pl-7 focus:border-[#1a1a1a] outline-none text-sm font-sans"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-[#1a1a1a] text-white flex items-center justify-center space-x-2 group relative overflow-hidden transition-all hover:bg-black disabled:opacity-70"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span className="text-xs uppercase tracking-widest font-bold">
                  {isLogin ? "Se connecter" : "S'inscrire"}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => { setIsLogin(!isLogin); setError(null); }}
            className="text-xs uppercase tracking-widest font-bold opacity-50 hover:opacity-100 transition-opacity"
          >
            {isLogin ? "Je n'ai pas de compte" : "J'ai déjà un compte"}
          </button>
        </div>
      </div>
    </div>
  );
}
