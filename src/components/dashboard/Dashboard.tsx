import React, { useEffect, useState } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  Timestamp,
  where 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Member, FinancialRecord, AttendanceRecord, ChurchConfig } from '../../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  Cell
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  TrendingUp, 
  Flame, 
  Activity,
  Heart,
  ChevronRight,
  ClipboardCheck,
  Plus,
  X,
  Cake,
  Bell
} from 'lucide-react';

import { useAuth } from '../AuthProvider';
import { addDoc, serverTimestamp, getDocs, limit } from 'firebase/firestore';

interface DashboardProps {
  onNavigate?: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [churchConfig, setChurchConfig] = useState<ChurchConfig | null>(null);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [dismissedBirthdays, setDismissedBirthdays] = useState<string[]>([]);
  const [newAttendance, setNewAttendance] = useState({
    date: new Date().toISOString().split('T')[0],
    visitors: '0',
    serviceType: 'Culto General',
    notes: ''
  });

  const { user, church, isAdmin } = useAuth();

  useEffect(() => {
    if (!user || !church) {
      setMembers([]);
      setRecords([]);
      setAttendance([]);
      return;
    }
    
    // Querying with churchId and adminEmails filter
    const qMembers = query(
      collection(db, 'members'), 
      where('churchId', '==', church.id),
      where('adminEmails', 'array-contains', user.email?.toLowerCase())
    );
    const unsubM = onSnapshot(qMembers, (snap) => {
      setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Member)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'members'));

    const qFinancials = query(
      collection(db, 'financials'), 
      where('churchId', '==', church.id),
      where('adminEmails', 'array-contains', user.email?.toLowerCase())
    );
    const unsubF = onSnapshot(qFinancials, (snap) => {
      setRecords(snap.docs.map(d => ({ 
        id: d.id, 
        ...d.data(), 
        date: d.data().date instanceof Timestamp ? d.data().date.toDate() : d.data().date 
      } as any)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'financials'));

    const qAttendance = query(
      collection(db, 'attendance'), 
      where('churchId', '==', church.id),
      where('adminEmails', 'array-contains', user.email?.toLowerCase())
    );
    const unsubA = onSnapshot(qAttendance, (snap) => {
      setAttendance(snap.docs.map(d => ({ 
        id: d.id, 
        ...d.data(), 
        date: d.data().date instanceof Timestamp ? d.data().date.toDate() : d.data().date 
      } as any)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'attendance'));

    // Fetch Church Config for birthday notice days
    const fetchConfig = async () => {
      const qConfig = query(
        collection(db, 'config'),
        where('churchId', '==', church.id),
        where('adminEmails', 'array-contains', user.email?.toLowerCase()),
        limit(1)
      );
      const snapConfig = await getDocs(qConfig);
      if (!snapConfig.empty) {
        setChurchConfig({ id: snapConfig.docs[0].id, ...snapConfig.docs[0].data() } as ChurchConfig);
      }
    };
    fetchConfig();

    return () => { unsubM(); unsubF(); unsubA(); };
  }, [user, church]);

  // Attendance Chart Data
  const attendanceChartData = attendance
    .sort((a, b) => {
      const dateA = a.date instanceof Date ? a.date : new Date(a.date);
      const dateB = b.date instanceof Date ? b.date : new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    })
    .map(record => {
      const date = record.date instanceof Date ? record.date : new Date(record.date);
      return {
        dateStr: date.toLocaleDateString('es', { day: '2-digit', month: 'short' }),
        asistencia: record.count,
        niños: record.breakdown?.children || 0,
        hombres: record.breakdown?.men || 0,
        mujeres: record.breakdown?.women || 0,
        visitas: record.breakdown?.visitors || 0,
        fullDate: date.toLocaleDateString()
      };
    })
    .slice(-12); // Last 12 services

  // Financial Chart Data
  const financialData = records.reduce((acc: any[], r) => {
    const date = r.date instanceof Date ? r.date : new Date(r.date);
    const month = date.toLocaleString('es', { month: 'short' });
    const existing = acc.find(item => item.month === month);
    if (existing) {
      if (r.type === 'income') existing.ingresos += r.amount;
      else existing.gastos += r.amount;
    } else {
      acc.push({ 
        month, 
        ingresos: r.type === 'income' ? r.amount : 0, 
        gastos: r.type === 'expense' ? r.amount : 0 
      });
    }
    return acc;
  }, []).slice(-6);

  const stats = [
    { label: 'Crecimiento', value: `${members.length} Almas`, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Ingresos p/m', value: `$${(records.filter(r => r.type === 'income').reduce((a,b) => a+b.amount, 0) / (financialData.length || 1)).toLocaleString('es-CL')}`, icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-50' },
    { label: 'Fuego Espiritual', value: `${members.filter(m => m.hasHolySpiritSeal).length} Sellados`, icon: Flame, color: 'text-teal-500', bg: 'bg-teal-50' },
    { label: 'Servicio Vital', value: `${members.filter(m => m.isServer).length} Obreros`, icon: Heart, color: 'text-accent', bg: 'bg-accent/10' },
  ];

  const handleAddAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !church) return;

    const selectedMembers = members.filter(m => selectedMemberIds.includes(m.id));
    const childrenCount = selectedMembers.filter(m => m.segment === 'Niño').length;
    const menCount = selectedMembers.filter(m => m.gender === 'M' && m.segment !== 'Niño').length;
    const womenCount = selectedMembers.filter(m => m.gender === 'F' && m.segment !== 'Niño').length;
    const visitorsCount = parseInt(newAttendance.visitors) || 0;
    const totalCount = selectedMembers.length + visitorsCount;

    try {
      await addDoc(collection(db, 'attendance'), {
        churchId: church.id,
        adminEmails: church.adminEmails,
        date: Timestamp.fromDate(new Date(newAttendance.date + 'T12:00:00')),
        count: totalCount,
        presentMemberIds: selectedMemberIds,
        breakdown: {
          children: childrenCount,
          men: menCount,
          women: womenCount,
          visitors: visitorsCount
        },
        serviceType: newAttendance.serviceType,
        notes: newAttendance.notes,
        createdAt: serverTimestamp()
      });
      setIsAttendanceModalOpen(false);
      setSelectedMemberIds([]);
      setNewAttendance({
        date: new Date().toISOString().split('T')[0],
        visitors: '0',
        serviceType: 'Culto General',
        notes: ''
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'attendance');
    }
  };

  const toggleMemberPresence = (id: string) => {
    setSelectedMemberIds(prev => 
      prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]
    );
  };

  const selectedMembers = members.filter(m => selectedMemberIds.includes(m.id));
  const autoBreakdown = {
    children: selectedMembers.filter(m => m.segment === 'Niño').length,
    men: selectedMembers.filter(m => m.gender === 'M' && m.segment !== 'Niño').length,
    women: selectedMembers.filter(m => m.gender === 'F' && m.segment !== 'Niño').length,
    visitors: parseInt(newAttendance.visitors) || 0,
    total: selectedMembers.length + (parseInt(newAttendance.visitors) || 0)
  };

  const upcomingBirthdays = members.filter(m => {
    if (!m.birthDate || dismissedBirthdays.includes(m.id)) return false;
    const noticeDays = churchConfig?.birthdayNoticeDays ?? 3;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [y, mm, dd] = m.birthDate.split('-').map(Number);
    const bday = new Date(today.getFullYear(), mm - 1, dd);
    
    if (bday < today) {
      bday.setFullYear(today.getFullYear() + 1);
    }

    const diffTime = bday.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays >= 0 && diffDays <= noticeDays;
  }).sort((a, b) => {
    const today = new Date();
    const getBday = (dStr: string) => {
      const [y, m, d] = dStr.split('-').map(Number);
      const date = new Date(today.getFullYear(), m - 1, d);
      if (date < today) date.setFullYear(today.getFullYear() + 1);
      return date.getTime();
    };
    return getBday(a.birthDate!) - getBday(b.birthDate!);
  });

  return (
    <div className="space-y-6">
      <header className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3">
        <div>
          <h2 className="text-text-main">Panel Principal</h2>
          <p className="text-sm text-text-muted font-medium">Análisis integral de la congregación y finanzas</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsAttendanceModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-2xl text-xs font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20 w-full sm:w-auto"
          >
            <ClipboardCheck size={16} />
            Registrar Asistencia
          </button>
        )}
      </header>

      <AnimatePresence>
        {upcomingBirthdays.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 p-6 bg-red-50 rounded-[2.5rem] border border-red-100 shadow-sm overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-500">
                  <Bell size={20} className="animate-bounce" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-red-900 uppercase tracking-widest">Alertas de Cumpleaños</h3>
                  <p className="text-xs text-red-700/60 font-bold">¡Celebremos la vida de nuestros miembros!</p>
                </div>
              </div>
              <button 
                onClick={() => setDismissedBirthdays(upcomingBirthdays.map(m => m.id))}
                className="text-[10px] font-black text-red-400 uppercase tracking-widest hover:text-red-600 transition-colors"
              >
                Cerrar todas
              </button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
              {upcomingBirthdays.map(m => {
                 const today = new Date();
                 const [y, mm, dd] = m.birthDate!.split('-').map(Number);
                 const bday = new Date(today.getFullYear(), mm - 1, dd);
                 if (bday < today) bday.setFullYear(today.getFullYear() + 1);
                 const diffDays = Math.ceil((bday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                 
                 return (
                   <motion.div 
                     layout
                     key={m.id} 
                     className="min-w-[200px] bg-white p-4 rounded-3xl border border-red-100 flex items-center gap-3 shadow-sm"
                   >
                     <div className="w-10 h-10 rounded-full bg-stone-50 flex items-center justify-center font-black text-xs text-stone-400 border border-stone-100 shrink-0">
                       {m.photoUrl ? <img src={m.photoUrl} className="w-full h-full object-cover rounded-full" /> : m.fullName.charAt(0)}
                     </div>
                     <div className="flex-1 min-w-0">
                       <p className="text-[11px] font-black text-stone-900 truncate uppercase tracking-tight">{m.fullName}</p>
                       <p className="text-[10px] font-bold text-red-500">
                         {diffDays === 0 ? '¡Hoy es su día! 🎂' : `En ${diffDays} día${diffDays === 1 ? '' : 's'}`}
                       </p>
                     </div>
                     <button 
                       onClick={() => setDismissedBirthdays(prev => [...prev, m.id])}
                       className="p-1.5 text-stone-200 hover:text-stone-400 transition-colors"
                     >
                       <X size={14} />
                     </button>
                   </motion.div>
                 );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 auto-rows-auto">
        {/* Attendance Card */}
        <div className="col-span-12 md:col-span-8 row-span-1 md:row-span-3 bento-card flex flex-col min-h-[400px]">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-text-main">Registro de Asistencia</h3>
              <p className="text-xs text-text-muted">Asistencia acumulada por día de culto</p>
            </div>
            <div className="badge-pill badge-pill-primary">
              Tendencia Reciente
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="dateStr" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 10, fontWeight: 600, fill: '#94a3b8'}} 
                />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                <Tooltip 
                  cursor={{fill: '#f0f9ff'}}
                  contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="niños" stackId="a" fill="#7dd3fc" radius={[0, 0, 0, 0]} />
                <Bar dataKey="mujeres" stackId="a" fill="#38bdf8" radius={[0, 0, 0, 0]} />
                <Bar dataKey="hombres" stackId="a" fill="#0ea5e9" radius={[0, 0, 0, 0]} />
                <Bar dataKey="visitas" stackId="a" fill="#0369a1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Treasury Quick View */}
        <div className="col-span-12 md:col-span-4 row-span-1 md:row-span-2 bg-gradient-to-br from-slate-900 to-blue-900 rounded-[2rem] p-8 text-white flex flex-col justify-between shadow-2xl relative overflow-hidden group">
          <div className="absolute -right-6 -bottom-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
             <TrendingUp size={140} />
          </div>
          <div className="flex justify-between items-center relative z-10">
            <span className="text-[10px] uppercase tracking-widest opacity-60 font-black">Activo Tesorería</span>
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold relative group-hover:bg-primary transition-colors">$</div>
          </div>
          <div className="my-6 relative z-10">
            <p className="text-3xl md:text-4xl font-display font-black">${(records.filter(r => r.type === 'income').reduce((a,b) => a+b.amount, 0) - records.filter(r => r.type === 'expense').reduce((a,b) => a+b.amount, 0)).toLocaleString('es-CL')}</p>
            <p className="badge-pill badge-pill-emerald border-none !p-0 inline-block">Crecimiento positivo</p>
          </div>
          <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4 relative z-10 font-display">
            <div>
              <p className="text-[10px] opacity-50 uppercase font-black tracking-tight">Ingresos</p>
              <p className="text-sm font-black text-emerald-400">${records.filter(r => r.type === 'income').reduce((a,b) => a+b.amount, 0).toLocaleString('es-CL')}</p>
            </div>
            <div>
              <p className="text-[10px] opacity-50 uppercase font-black tracking-tight">Egresos</p>
              <p className="text-sm font-black text-rose-400">${records.filter(r => r.type === 'expense').reduce((a,b) => a+b.amount, 0).toLocaleString('es-CL')}</p>
            </div>
          </div>
        </div>

        {/* Spiritual Maturity Card */}
        <div className="col-span-12 md:col-span-4 row-span-1 md:row-span-2 bg-secondary rounded-[2rem] p-8 text-white flex flex-col justify-between shadow-xl shadow-secondary/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-20 transform translate-x-4 -translate-y-4 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform duration-500">
             <Activity size={80} />
          </div>
          <h3 className="text-[10px] font-black uppercase tracking-widest opacity-80 relative z-10">Estado Espiritual</h3>
          <div className="space-y-5 relative z-10 font-display">
            <div className="space-y-1.5">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black uppercase tracking-tight">Bautizados</span>
                <span className="text-lg font-black">{members.length > 0 ? Math.round((members.filter(m => m.isBaptized).length / members.length) * 100) : 0}%</span>
              </div>
              <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden backdrop-blur-md">
                <div 
                  className="bg-white h-full transition-all duration-1000 ease-out" 
                  style={{ width: `${members.length > 0 ? (members.filter(m => m.isBaptized).length / members.length) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black uppercase tracking-tight">Sello Espíritu S.</span>
                <span className="text-lg font-black">{members.length > 0 ? Math.round((members.filter(m => m.hasHolySpiritSeal).length / members.length) * 100) : 0}%</span>
              </div>
              <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden backdrop-blur-md">
                <div 
                  className="bg-white h-full transition-all duration-1000 ease-out" 
                  style={{ width: `${members.length > 0 ? (members.filter(m => m.hasHolySpiritSeal).length / members.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Members List */}
        <div className="col-span-12 md:col-span-4 row-span-1 md:row-span-3 bento-card flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-display font-bold text-text-main">Membresía Reciente</h3>
            <Users size={16} className="text-slate-300" />
          </div>
          <div className="space-y-4 flex-1 overflow-y-auto no-scrollbar">
            {members.slice(-4).reverse().map((m, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-slate-50 pb-3 last:border-0 hover:bg-slate-50/50 rounded-lg transition-colors p-1">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center font-bold text-primary border border-blue-100/50 shadow-sm shrink-0">
                  {m.photoUrl ? <img src={m.photoUrl} className="w-full h-full object-cover rounded-xl" /> : m.fullName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-text-main truncate">{m.fullName}</p>
                  <p className="text-[10px] text-text-muted font-medium">{m.serverRole || 'Miembro'}</p>
                </div>
                {m.isBaptized && <div className="badge-pill badge-pill-emerald">Bautizado</div>}
              </div>
            ))}
          </div>
          <button 
            onClick={() => onNavigate?.('members')}
            className="w-full mt-4 py-3 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-text-muted hover:bg-slate-50 transition-colors shadow-sm"
          >
            Ver Registro Completo
          </button>
        </div>

        {/* Quick Stats Cards */}
        <div className="col-span-12 md:col-span-4 row-span-1 bento-card flex items-center gap-5 py-5 hover:bg-blue-50/50 transition-all border border-slate-100/50">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-primary shadow-inner">
            <Users size={24} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-black text-text-muted tracking-[0.1em]">Membresía Total</p>
            <p className="text-2xl font-display font-black text-text-main">{members.length}</p>
          </div>
        </div>

        <div className="col-span-12 md:col-span-4 row-span-1 bento-card flex items-center gap-5 py-5 hover:bg-teal-50/50 transition-all border border-slate-100/50">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-500 shadow-inner">
            <Flame size={24} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-black text-text-muted tracking-[0.1em]">Sellados E.S.</p>
            <p className="text-2xl font-display font-black text-text-main">{members.filter(m => m.hasHolySpiritSeal).length}</p>
          </div>
        </div>

        {/* Family Connection Card */}
        <div className="col-span-12 md:col-span-4 row-span-1 md:row-span-2 bg-primary rounded-[2rem] p-8 text-white flex flex-col justify-between shadow-xl shadow-primary/20 transition-transform hover:scale-[1.01]">
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Impacto Familiar</h3>
            <p className="text-xs opacity-60">Seguimiento de núcleos familiares conectados.</p>
          </div>
          <div className="my-6">
            <p className="text-3xl md:text-4xl font-display font-black tracking-tighter">74%</p>
            <p className="text-[10px] opacity-60 mt-1 uppercase font-black tracking-widest">Congregación con vínculos</p>
          </div>
          <button className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-white/10 active:scale-95">
            Explorar Vínculos
          </button>
        </div>

        <div className="col-span-12 md:col-span-4 row-span-1 bento-card flex items-center gap-5 py-5 hover:bg-teal-50/50 transition-all border border-slate-100/50">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 shadow-inner">
             <Heart size={24} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-black text-text-muted tracking-[0.1em]">Servidores</p>
            <p className="text-2xl font-display font-black text-text-main">{members.filter(m => m.isServer).length}</p>
          </div>
        </div>
      </div>

      {/* Attendance Modal */}
      {isAttendanceModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-[2rem] sm:rounded-[2.5rem] w-full max-w-2xl p-5 sm:p-10 shadow-2xl flex flex-col max-h-[90vh] border border-slate-100"
          >
            <div className="flex justify-between items-center mb-6 sm:mb-8">
              <div>
                <h3 className="text-lg sm:text-2xl font-display font-bold text-text-main">Registrar Asistencia</h3>
                <p className="text-xs text-text-muted">Marca los miembros presentes y añade visitas</p>
              </div>
              <button 
                onClick={() => setIsAttendanceModalOpen(false)}
                className="p-2 text-slate-300 hover:text-slate-900 hover:bg-slate-50 rounded-full transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddAttendance} className="space-y-6 flex-1 overflow-y-auto pr-2 no-scrollbar">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Fecha del Culto</label>
                  <input 
                    type="date"
                    value={newAttendance.date}
                    onChange={(e) => setNewAttendance({ ...newAttendance, date: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm focus:ring-4 focus:ring-primary/10 transition-all font-bold text-slate-700"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Tipo de Servicio</label>
                  <select 
                    value={newAttendance.serviceType}
                    onChange={(e) => setNewAttendance({ ...newAttendance, serviceType: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm focus:ring-4 focus:ring-primary/10 transition-all font-bold text-slate-700"
                  >
                    <option>Culto General</option>
                    <option>Estudio Bíblico</option>
                    <option>Sociedad de Jóvenes</option>
                    <option>Escuela Dominical</option>
                    <option>Especial</option>
                  </select>
                </div>
              </div>

              {/* Member Selection */}
              <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Asistencia Individual</label>
                  <span className="badge-pill badge-pill-primary">{selectedMemberIds.length} MIEMBROS</span>
                </div>
                <input 
                  type="text"
                  placeholder="Buscar miembro..."
                  value={memberSearchTerm}
                  onChange={(e) => setMemberSearchTerm(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                />
                <div className="space-y-6 max-h-[350px] overflow-y-auto p-1 no-scrollbar">
                  {(['Niño', 'Adolescente', 'Joven', 'Adulto'] as const).map(segment => {
                    const segmentMembers = members.filter(m => 
                      m.segment === segment && 
                      m.fullName.toLowerCase().includes(memberSearchTerm.toLowerCase())
                    );
                    if (segmentMembers.length === 0) return null;

                    return (
                      <div key={segment} className="space-y-3">
                        <div className="flex justify-between items-center px-1 sticky top-0 bg-white/95 backdrop-blur-sm z-10 py-2 border-b border-slate-50">
                          <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">{segment}s</label>
                          <button 
                            type="button"
                            onClick={() => {
                              const allInSegment = segmentMembers.map(m => m.id);
                              const currentSelected = selectedMemberIds.filter(id => allInSegment.includes(id));
                              if (currentSelected.length === allInSegment.length) {
                                setSelectedMemberIds(prev => prev.filter(id => !allInSegment.includes(id)));
                              } else {
                                setSelectedMemberIds(prev => Array.from(new Set([...prev, ...allInSegment])));
                              }
                            }}
                            className="text-[9px] font-black uppercase text-primary hover:text-blue-700 transition-colors"
                          >
                            {segmentMembers.every(m => selectedMemberIds.includes(m.id)) ? 'Deseleccionar' : 'Marcar Segmento'}
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {segmentMembers.map(m => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => toggleMemberPresence(m.id)}
                              className={`flex items-center gap-4 p-3.5 rounded-2xl border-2 transition-all text-left group ${
                                selectedMemberIds.includes(m.id) 
                                  ? 'border-blue-500 bg-blue-50' 
                                  : 'border-slate-50 bg-slate-50/50 hover:bg-white hover:border-slate-200'
                              }`}
                            >
                              <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center font-bold text-blue-300 border border-slate-100 overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                                {m.photoUrl ? <img src={m.photoUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : m.fullName.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate">{m.fullName}</p>
                                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mt-0.5">{m.gender === 'M' ? 'Hombre' : 'Mujer'}</p>
                              </div>
                              <div className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-colors ${
                                selectedMemberIds.includes(m.id) ? 'bg-blue-500 border-blue-500' : 'bg-white border-slate-200 group-hover:border-slate-300'
                              }`}>
                                {selectedMemberIds.includes(m.id) && <div className="w-2 h-2 bg-white rounded-sm" />}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-end pt-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Visitas No Registradas</label>
                  <input 
                    type="number"
                    placeholder="0"
                    value={newAttendance.visitors}
                    onChange={(e) => setNewAttendance({ ...newAttendance, visitors: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm focus:ring-4 focus:ring-primary/10 transition-all font-bold text-slate-700"
                    required
                  />
                </div>
                <div className="bg-slate-900 rounded-3xl p-5 text-white flex justify-between items-center h-[58px] shadow-xl">
                   <div className="flex items-center gap-2">
                     <Users size={16} className="text-blue-400" />
                     <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Total hoy</span>
                   </div>
                   <span className="text-2xl font-display font-black">{autoBreakdown.total}</span>
                </div>
              </div>

              {/* Summary of breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Niños', val: autoBreakdown.children, icon: <Activity size={12} />, color: 'text-blue-500' },
                  { label: 'Hombres', val: autoBreakdown.men, icon: <Users size={12} />, color: 'text-indigo-500' },
                  { label: 'Mujeres', val: autoBreakdown.women, icon: <Heart size={12} />, color: 'text-rose-500' },
                  { label: 'Visitas', val: autoBreakdown.visitors, icon: <Flame size={12} />, color: 'text-cyan-500' },
                ].map((item, i) => (
                  <div key={i} className="bg-slate-50 p-3 rounded-2xl text-center border border-slate-100">
                    <div className={`flex items-center justify-center gap-1.5 mb-1 ${item.color}`}>
                       {item.icon}
                       <p className="text-[8px] font-black uppercase tracking-tighter">{item.label}</p>
                    </div>
                    <p className="text-lg font-display font-black text-slate-800">{item.val}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Notas del Servicio</label>
                <textarea 
                  placeholder="Mensaje de la palabra, testimonios relevantes, peticiones especiales..."
                  value={newAttendance.notes}
                  onChange={(e) => setNewAttendance({ ...newAttendance, notes: e.target.value })}
                  className="w-full px-5 py-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm focus:ring-4 focus:ring-primary/10 transition-all font-medium h-24 resize-none"
                />
              </div>

              <button 
                type="submit"
                className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                Cerrar Registro y Guardar
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
