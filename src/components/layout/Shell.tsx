import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../AuthProvider';
import { 
  Users, 
  Wallet, 
  LayoutDashboard, 
  LogOut, 
  LogIn,
  Church,
  CircleUser,
  Send,
  ClipboardCheck
} from 'lucide-react';
import { motion } from 'motion/react';
import { collection, query, limit, getDocs, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ChurchConfig } from '../../types';

interface ShellProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Shell: React.FC<ShellProps> = ({ children, activeTab, setActiveTab }) => {
  const { user, login, logout, loading, isAdmin, hasRole, userRoles, church } = useAuth();
  const [churchName, setChurchName] = useState('Ecclesia');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (church) {
      setChurchName(church.name);
    }
  }, [church]);

  useEffect(() => {
    const fetchConfig = async () => {
      if (!user || !church) return;
      try {
        const q = query(
          collection(db, 'config'), 
          where('churchId', '==', church.id),
          where('adminEmails', 'array-contains', user.email?.toLowerCase()),
          limit(1)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const docData = querySnapshot.docs[0].data() as ChurchConfig;
          if (docData.name) setChurchName(docData.name);
          if (docData.logoUrl) setLogoUrl(docData.logoUrl);
        }
      } catch (error) {
        console.error('Error fetching config in Shell:', error);
      }
    };
    fetchConfig();
  }, [user, church]);

  // Reset scroll when tab changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo(0, 0);
    }
  }, [activeTab]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'members', label: 'Miembros', icon: Users },
    { id: 'attendance', label: 'Asistencia', icon: ClipboardCheck },
    { id: 'treasury', label: 'Tesorería', icon: Wallet },
    ...(hasRole(['Tesorero', 'Pastor']) ? [
      { id: 'submissions', label: 'Envíos', icon: Send },
    ] : []),
    ...(isAdmin ? [
      { id: 'settings', label: 'Configuración', icon: Church }
    ] : []),
  ];

  return (
    <div className="min-h-screen flex flex-col bg-surface overflow-hidden">
      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 right-0 h-16 px-4 md:px-8 flex items-center justify-between liquid-glass z-50 md:mt-4 md:mx-8 md:rounded-2xl transition-all">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-8 h-8 md:w-9 md:h-9 bg-primary rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
              {churchName.charAt(0)}
            </div>
          )}
          <span className="text-base md:text-lg font-display font-black tracking-tight text-slate-900">{churchName}</span>
        </div>

        <div className="hidden md:flex gap-8 text-sm font-black text-slate-400">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`hover:text-primary transition-all relative py-1 focus:outline-none ${
                activeTab === item.id ? 'text-primary' : ''
              }`}
            >
              {item.label}
              {activeTab === item.id && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute -bottom-[22px] left-0 right-0 h-[3px] bg-primary rounded-t-full shadow-lg shadow-blue-500/40" 
                />
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          {loading ? (
            <div className="w-10 h-10 rounded-full bg-slate-100 animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-[10px] font-black leading-none text-text-main">{user.displayName || 'Admin'}</p>
                <div className="flex flex-wrap gap-1 mt-1 justify-end">
                  {userRoles.length > 0 ? (
                    userRoles.map(role => (
                      <span key={role} className="badge-pill badge-pill-slate !py-0.5 !px-[5px] !text-[7px]">{role}</span>
                    ))
                  ) : (
                    <span className="badge-pill badge-pill-slate !py-0.5 !px-[5px] !text-[7px]">Observador</span>
                  )}
                </div>
              </div>
              <div className="group relative">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full border border-border" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-white border border-border">
                    <CircleUser size={24} />
                  </div>
                )}
                <button 
                  onClick={logout}
                  className="absolute -top-1 -right-1 p-1 bg-white border border-border rounded-full text-text-muted hover:text-red-500 shadow-sm transition-colors"
                >
                  <LogOut size={12} />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={login}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:opacity-90 transition-all"
            >
              <LogIn size={16} />
              Acceso
            </button>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden pt-20 md:pt-28 pb-24 md:pb-8"
      >
        <div className="w-full max-w-7xl mx-auto p-4 md:p-8">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.19, 1, 0.22, 1] }}
          >
            {children}
          </motion.div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-6 left-6 right-6 h-16 liquid-glass rounded-3xl px-4 flex items-center justify-between z-50">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all py-1 ${
              activeTab === item.id ? 'text-primary scale-110' : 'text-slate-400'
            }`}
          >
            <div className={`p-2 rounded-xl transition-all ${activeTab === item.id ? 'bg-blue-50' : ''}`}>
              <item.icon size={20} strokeWidth={activeTab === item.id ? 2.5 : 2} />
            </div>
          </button>
        ))}
      </nav>
    </div>
  );
};
