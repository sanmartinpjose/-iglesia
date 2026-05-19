import React, { useState } from 'react';
import { useAuth } from '../AuthProvider';
import { Church as ChurchIcon, Plus, ArrowRight, LogOut } from 'lucide-react';
import { motion } from 'motion/react';

export const ChurchSetup: React.FC = () => {
  const { user, createChurch, logout } = useAuth();
  const [churchName, setChurchName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!churchName.trim()) return;
    setLoading(true);
    await createChurch(churchName);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden"
      >
        <div className="p-10 text-center">
          <div className="w-20 h-20 bg-slate-900 rounded-[2rem] flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-slate-200">
            <ChurchIcon size={40} />
          </div>
          <h1 className="text-3xl font-serif font-black text-slate-900 mb-2">Bienvenido</h1>
          <p className="text-slate-500 font-medium">Para comenzar, configura el nombre de tu congregación.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-10 pt-0 space-y-6">
          <div className="space-y-2">
            <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-400">Nombre de la Iglesia</label>
            <input
              required
              type="text"
              placeholder="Ej: Iglesia Central"
              className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-slate-200 transition-all font-bold text-slate-900"
              value={churchName}
              onChange={e => setChurchName(e.target.value)}
            />
          </div>

          <button
            disabled={loading || !churchName.trim()}
            className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-bold text-lg hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-2 group disabled:opacity-50"
          >
            {loading ? 'Configurando...' : (
              <>
                <span>Crear Congregación</span>
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-slate-900 transition-all font-bold text-sm"
          >
            <LogOut size={16} />
            Salir de {user?.email}
          </button>
        </form>
      </motion.div>
    </div>
  );
};
