import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  Timestamp,
  doc,
  getDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { AttendanceRecord, Member } from '../../types';
import { useAuth } from '../AuthProvider';
import { motion } from 'motion/react';
import { 
  Calendar, 
  Users, 
  ChevronRight, 
  UserPlus, 
  Info,
  History,
  TrendingUp
} from 'lucide-react';

export const AttendanceHistory: React.FC = () => {
  const { church, user } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!church || !user) return;

    const q = query(
      collection(db, 'attendance'),
      where('churchId', '==', church.id),
      where('adminEmails', 'array-contains', user.email?.toLowerCase()),
      orderBy('date', 'desc')
    );

    const unsubA = onSnapshot(q, (snap) => {
      setRecords(snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        date: d.data().date instanceof Timestamp ? d.data().date.toDate() : d.data().date
      } as any)));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'attendance'));

    const qM = query(
      collection(db, 'members'),
      where('churchId', '==', church.id),
      where('adminEmails', 'array-contains', user.email?.toLowerCase())
    );
    const unsubM = onSnapshot(qM, (snap) => {
      setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Member)));
    });

    return () => { unsubA(); unsubM(); };
  }, [church, user]);

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h2 className="text-text-main">Historial de Asistencia</h2>
        <p className="text-sm text-text-muted font-medium">Registro detallado de todos los servicios realizados</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* History List */}
        <div className="lg:col-span-7 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 bg-stone-50 rounded-[2.5rem] border border-stone-200">
               <div className="w-12 h-12 border-4 border-stone-200 border-t-primary rounded-full animate-spin mb-4" />
               <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Cargando registros...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center bg-stone-50 rounded-[2.5rem] border border-dashed border-stone-300">
               <History size={48} className="mx-auto text-stone-300 mb-4" />
               <p className="text-sm text-slate-400 font-bold">Aún no hay registros de asistencia.</p>
            </div>
          ) : (
            records.map((record) => (
              <motion.button
                key={record.id}
                layoutId={record.id}
                onClick={() => setSelectedRecord(record)}
                className={`w-full text-left p-4 rounded-3xl border transition-all flex items-center gap-4 ${
                  selectedRecord?.id === record.id 
                    ? 'border-primary bg-primary/5 shadow-lg shadow-primary/5' 
                    : 'border-transparent bg-white hover:bg-stone-50 shadow-sm'
                }`}
              >
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-900 shrink-0">
                  <span className="text-[8px] font-black uppercase leading-none mb-0.5">{record.date.toLocaleDateString('es', { month: 'short' })}</span>
                  <span className="text-lg font-display font-black leading-none">{record.date.getDate()}</span>
                </div>
                
                <div className="flex-1">
                  <h4 className="text-slate-900">{record.serviceType}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="badge-pill badge-pill-slate flex items-center gap-1 pr-2">
                      <Users size={9} /> {record.count}
                    </span>
                    <span className="badge-pill badge-pill-slate flex items-center gap-1 pr-2">
                      <UserPlus size={9} /> {record.breakdown.visitors}
                    </span>
                  </div>
                </div>

                <ChevronRight size={16} className={selectedRecord?.id === record.id ? 'text-primary' : 'text-stone-300'} />
              </motion.button>
            ))
          )}
        </div>

        {/* Selected Record Detail */}
        <div className="lg:col-span-5">
          <div className="sticky top-6 bg-stone-900 rounded-[2.5rem] p-8 text-white min-h-[400px] shadow-2xl overflow-hidden relative">
            {!selectedRecord ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                <Info size={48} className="mb-4" />
                <p className="text-sm font-bold uppercase tracking-widest">Selecciona un registro<br/>para ver detalles</p>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <header>
                  <div className="flex justify-between items-start mb-4">
                    <span className="badge-pill border-white/20 bg-white/10 text-white/80">
                      {selectedRecord.serviceType}
                    </span>
                    <span className="text-xs font-bold text-white/50">
                      {selectedRecord.date.toLocaleDateString('es', { weekday: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  <h1 className="text-4xl font-black leading-tight">
                    {selectedRecord.count} <span className="text-lg font-sans font-normal text-white/60">Asistentes</span>
                  </h1>
                </header>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 p-4 rounded-3xl border border-white/10">
                    <p className="text-[10px] font-black uppercase text-white/40 mb-2">Desglose</p>
                    <div className="space-y-2">
                       <div className="flex justify-between items-center text-xs">
                          <span className="text-white/60">Niños</span>
                          <span className="font-bold">{selectedRecord.breakdown.children}</span>
                       </div>
                       <div className="flex justify-between items-center text-xs">
                          <span className="text-white/60">Hombres</span>
                          <span className="font-bold">{selectedRecord.breakdown.men}</span>
                       </div>
                       <div className="flex justify-between items-center text-xs">
                          <span className="text-white/60">Mujeres</span>
                          <span className="font-bold">{selectedRecord.breakdown.women}</span>
                       </div>
                       <div className="flex justify-between items-center text-xs">
                          <span className="text-white/60">Visitas</span>
                          <span className="font-bold text-blue-300">{selectedRecord.breakdown.visitors}</span>
                       </div>
                    </div>
                  </div>

                  <div className="bg-white/5 p-4 rounded-3xl border border-white/10">
                    <p className="text-[10px] font-black uppercase text-white/40 mb-2">Miembros Presentes</p>
                    <div className="flex -space-x-2">
                      {selectedRecord.presentMemberIds.slice(0, 5).map(id => {
                        const m = members.find(m => m.id === id);
                        return (
                          <div key={id} className="w-8 h-8 rounded-full border-2 border-stone-900 bg-stone-700 overflow-hidden">
                            {m?.photoUrl ? <img src={m.photoUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px]">{m?.fullName.charAt(0)}</div>}
                          </div>
                        );
                      })}
                      {selectedRecord.presentMemberIds.length > 5 && (
                        <div className="w-8 h-8 rounded-full border-2 border-stone-900 bg-stone-800 flex items-center justify-center text-[10px] font-bold">
                          +{selectedRecord.presentMemberIds.length - 5}
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] mt-2 text-white/40">{selectedRecord.presentMemberIds.length} miembros registrados</p>
                  </div>
                </div>

                {selectedRecord.notes && (
                  <div className="bg-primary/10 p-6 rounded-3xl border border-primary/20">
                    <p className="text-[10px] font-black uppercase text-blue-300 mb-2">Notas del Culto</p>
                    <p className="text-sm text-stone-200 leading-relaxed italic">"{selectedRecord.notes}"</p>
                  </div>
                )}
              </motion.div>
            )}
            
            {/* Simple decoration */}
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-primary/20 rounded-full blur-[100px]" />
          </div>
        </div>
      </div>
    </div>
  );
};
