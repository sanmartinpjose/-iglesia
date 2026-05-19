import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, Timestamp, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { FinancialRecord, ChurchConfig } from '../../types';
import { useAuth } from '../AuthProvider';
import { 
  CircleDollarSign, 
  Globe, 
  ArrowDownToLine, 
  ShieldAlert,
  User,
  ChevronRight,
  CalendarIcon,
  Calculator
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

export const Submissions: React.FC = () => {
  const { church, hasRole, user } = useAuth();
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [config, setConfig] = useState<ChurchConfig | null>(null);
  
  if (!hasRole(['Tesorero', 'Pastor'])) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-xl font-display font-black text-stone-900 uppercase tracking-tight">Acceso Restringido</h2>
          <p className="text-sm text-gray-soft max-w-xs mx-auto">Esta sección es exclusiva para Tesorería y Pastores.</p>
        </div>
      </div>
    );
  }

  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  useEffect(() => {
    if (!church) return;
    const fetchConfig = async () => {
      try {
        const q = query(
          collection(db, 'config'), 
          where('churchId', '==', church.id),
          where('adminEmails', 'array-contains', user?.email?.toLowerCase()),
          limit(1)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setConfig(querySnapshot.docs[0].data() as ChurchConfig);
        }
      } catch (error) {
        console.error('Error fetching config in Submissions:', error);
      }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    if (!church) return;
    const q = query(
      collection(db, 'financials'),
      where('churchId', '==', church.id),
      where('adminEmails', 'array-contains', user?.email?.toLowerCase()),
      where('date', '>=', Timestamp.fromDate(new Date(dateRange.start))),
      where('date', '<=', Timestamp.fromDate(new Date(dateRange.end)))
    );
    
    const unsub = onSnapshot(q, (snap) => {
      setRecords(snap.docs.map(d => ({ ...d.data(), id: d.id } as FinancialRecord)));
    });
    return unsub;
  }, [dateRange]);

  // Calculations based on the requested image logic
  const tithesTotal = records.filter(r => r.type === 'income' && r.category === 'Diezmos').reduce((a, b) => a + b.amount, 0);
  const offeringsTotal = records.filter(r => r.type === 'income' && r.category === 'Ofrendas').reduce((a, b) => a + b.amount, 0);
  const missionsTotal = records.filter(r => r.type === 'income' && r.category === 'Misiones').reduce((a, b) => a + b.amount, 0);
  const expensesTotal = records.filter(r => r.type === 'expense').reduce((a, b) => a + b.amount, 0);

  // Distribution percentages
  const titheOfTithes = tithesTotal * 0.10;
  const fospFund = tithesTotal * 0.07;
  const remainingForPastor = tithesTotal - (titheOfTithes + fospFund);

  // Helper to get totals by subcategory
  const getSubcategoryTotal = (subcategory: string) => {
    return records
      .filter(r => r.subcategory === subcategory)
      .reduce((a, b) => a + b.amount, 0);
  };

  return (
    <div className="space-y-6 md:space-y-10">
      <header className="mb-2">
        <h2 className="text-text-main">Envíos de Tesorería</h2>
        <p className="text-sm text-text-muted font-medium">Distribución mensual y aportes reglamentarios.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* Ofrendas y Servicios Especiales */}
        <div className="bento-card border-none !p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-1">Ofrendas y Especiales</p>
                <h3 className="text-lg md:text-xl font-display font-black text-text-main">${offeringsTotal.toLocaleString('es-CL')}</h3>
              </div>
              <div className="p-2.5 bg-sky-50 text-sky-500 rounded-xl">
                 <CircleDollarSign size={20} />
              </div>
            </div>
            <div className="space-y-2.5 pt-4">
              {config?.specialServices?.map(service => (
                <div key={service.name} className="flex justify-between text-[11px] font-bold text-slate-500 border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                  <span className="truncate mr-2">{service.name}</span>
                  <span className="text-slate-800">${getSubcategoryTotal(service.name).toLocaleString('es-CL')}</span>
                </div>
              ))}
              {!config?.specialServices?.length && (
                <p className="text-[10px] text-text-muted italic">No hay servicios especiales registrados.</p>
              )}
            </div>
          </div>
        </div>

        {/* Días Misioneros */}
        <div className="bento-card border-none !p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-1">Días Misioneros</p>
                <h3 className="text-lg md:text-xl font-display font-black text-text-main">
                  ${config?.missionaryDays?.reduce((acc, day) => acc + getSubcategoryTotal(day.name), 0).toLocaleString('es-CL')}
                </h3>
              </div>
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                 <Globe size={20} />
              </div>
            </div>
            <div className="space-y-2.5 pt-4">
              {config?.missionaryDays?.map(day => (
                <div key={day.name} className="flex justify-between text-[11px] font-bold text-slate-500 border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                  <span className="truncate mr-2">{day.name}</span>
                  <span className="text-slate-800">${getSubcategoryTotal(day.name).toLocaleString('es-CL')}</span>
                </div>
              ))}
              {!config?.missionaryDays?.length && (
                <p className="text-[10px] text-text-muted italic">No hay días misioneros registrados.</p>
              )}
            </div>
          </div>
        </div>

        {/* Gastos Card */}
        <div className="bento-card border-none !p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-1">Egresos Totales</p>
                <h3 className="text-lg md:text-xl font-display font-black text-text-main">${expensesTotal.toLocaleString('es-CL')}</h3>
              </div>
              <div className="p-2.5 bg-rose-50 text-rose-500 rounded-xl">
                 <ArrowDownToLine size={20} />
              </div>
            </div>
            <div className="mt-8 pt-4 border-t border-slate-50">
              <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Resumen Mensual</p>
              <div className="mt-2 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                <span className="text-xs font-black text-rose-600">Balance Activo</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Envío Section */}
      <div className="bento-card border-none !p-0 overflow-hidden shadow-xl">
         <div className="p-6 md:p-8 border-b border-slate-50 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
               <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shadow-inner">
                  <Calculator size={24} />
               </div>
               <div>
                  <h3 className="text-lg md:text-xl font-display font-black text-text-main">Cálculo de Diezmos</h3>
                  <p className="text-xs text-text-muted font-medium">Distribución automática según reglamento</p>
               </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-50 p-2 rounded-[2rem] border border-slate-100">
               <div className="flex items-center gap-2 px-4 py-2">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-blue-400 shadow-sm">
                    <CalendarIcon size={14} />
                  </div>
                  <input 
                     type="date" 
                     className="bg-transparent text-[11px] font-black border-none p-0 focus:ring-0 uppercase tracking-tighter"
                     value={dateRange.start}
                     onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                  />
               </div>
               <div className="hidden sm:block h-6 w-px bg-slate-200"></div>
               <div className="flex items-center gap-2 px-4 py-2">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-blue-400 shadow-sm">
                    <ChevronRight size={14} />
                  </div>
                  <input 
                     type="date" 
                     className="bg-transparent text-[11px] font-black border-none p-0 focus:ring-0 uppercase tracking-tighter"
                     value={dateRange.end}
                     onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                  />
               </div>
               <div className="bg-slate-900 rounded-[1.5rem] px-6 py-3 ml-1 shadow-lg shadow-slate-200">
                  <p className="text-[8px] font-black uppercase tracking-[0.2em] text-blue-400 mb-0.5">Total Liquidado</p>
                  <p className="text-lg font-display font-black text-white">${tithesTotal.toLocaleString('es-CL')}</p>
               </div>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            <div className="p-8 md:p-10 space-y-6 hover:bg-slate-50/50 transition-colors">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs border border-blue-100">10%</div>
                  <span className="text-xs font-black uppercase tracking-widest text-text-muted">Diezmo de Diezmos</span>
               </div>
               <div className="space-y-1">
                 <p className="text-xs text-text-muted font-medium">Aporte General</p>
                 <p className="text-2xl md:text-3xl font-display font-black text-text-main">${titheOfTithes.toLocaleString('es-CL')}</p>
               </div>
            </div>

            <div className="p-8 md:p-10 space-y-6 bg-slate-50/30">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs border border-indigo-100">7%</div>
                  <span className="text-xs font-black uppercase tracking-widest text-text-muted">Fondo Ministerial (FOSP)</span>
               </div>
               <div className="space-y-1">
                 <p className="text-xs text-text-muted font-medium">Caja de Seguridad</p>
                 <p className="text-2xl md:text-3xl font-display font-black text-text-main">${fospFund.toLocaleString('es-CL')}</p>
               </div>
            </div>

            <div className="p-8 md:p-10 space-y-6 hover:bg-slate-50/50 transition-colors">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                        <User size={18} />
                     </div>
                     <span className="text-xs font-black uppercase tracking-widest text-text-muted">Asignación Pastoral</span>
                  </div>
               </div>
               <div className="space-y-1">
                 <p className="text-xs text-text-muted font-medium">Neto Percibido</p>
                 <p className="text-2xl md:text-3xl font-display font-black text-emerald-600">${remainingForPastor.toLocaleString('es-CL')}</p>
               </div>
               <div className="pt-6 space-y-2 border-t border-slate-100">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                     <span className="text-text-muted">Entregado:</span>
                     <span className="text-emerald-500">$0</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                     <span className="text-text-muted">Saldo Pendiente:</span>
                     <span className="text-blue-600">${remainingForPastor.toLocaleString('es-CL')}</span>
                  </div>
               </div>
            </div>
         </div>

         <div className="bg-slate-900 p-6 flex flex-col sm:flex-row items-center gap-4">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
              <ShieldAlert size={16} />
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed font-medium uppercase tracking-[0.05em]">Este reporte usa los ingresos registrados como 'Diezmos' para calcular la distribución reglamentaria. Los valores son sugerencias sujetas a revisión por la junta administrativa.</p>
         </div>
      </div>
    </div>
  );
};
