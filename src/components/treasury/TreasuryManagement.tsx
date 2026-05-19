import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  serverTimestamp, 
  orderBy,
  Timestamp,
  limit,
  getDocs,
  where
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { FinancialRecord, Member, ChurchConfig } from '../../types';
import { useAuth } from '../AuthProvider';
import { 
  Plus, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  TrendingUp, 
  TrendingDown, 
  Trash2, 
  Search,
  DollarSign,
  Calendar,
  Tag,
  X,
  Lock,
  Wallet,
  Filter,
  Calculator,
  User,
  Edit2,
  ClipboardCheck,
  Shield
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const TreasuryManagement: React.FC = () => {
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FinancialRecord | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<FinancialRecord | null>(null);
  const { user, isAdmin, church } = useAuth();
  const [config, setConfig] = useState<ChurchConfig | null>(null);

  // Filters state
  const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i + 1);
  const months = [
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' },
  ];

  useEffect(() => {
    if (!church) return;
    const fetchConfig = async () => {
      try {
        const q = query(
          collection(db, 'config'), 
          where('churchId', '==', church.id),
          where('adminEmails', 'array-contains', user.email?.toLowerCase()),
          limit(1)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setConfig(querySnapshot.docs[0].data() as ChurchConfig);
        }
      } catch (error) {
        console.error('Error fetching config in Treasury:', error);
      }
    };
    fetchConfig();
  }, []);

  const [formData, setFormData] = useState({
    type: 'income' as 'income' | 'expense',
    category: 'Diezmos',
    subcategory: '',
    amount: '',
    cashAmount: '',
    transferAmount: '',
    contributorName: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    memberId: ''
  });

  useEffect(() => {
    if (formData.category === 'Diezmos') {
      if (formData.subcategory === 'Pastor') {
        setFormData(prev => prev.type !== 'expense' ? { ...prev, type: 'expense' } : prev);
      } else if (formData.type !== 'income') {
        setFormData(prev => ({ ...prev, type: 'income' }));
      }
    }
  }, [formData.category, formData.subcategory]);

  useEffect(() => {
    if (!user || !church) {
      setRecords([]);
      setLoading(false);
      return;
    }

    const qF = query(
      collection(db, 'financials'), 
      where('churchId', '==', church.id),
      where('adminEmails', 'array-contains', user.email?.toLowerCase()),
      orderBy('date', 'desc')
    );
    const unsubF = onSnapshot(qF, (snap) => {
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as FinancialRecord)));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'financials'));

    const qM = query(
      collection(db, 'members'), 
      where('churchId', '==', church.id),
      where('adminEmails', 'array-contains', user.email?.toLowerCase()),
      orderBy('fullName', 'asc')
    );
    const unsubM = onSnapshot(qM, (snap) => {
      setMembers(snap.docs.map(d => ({ id: d.id, fullName: d.data().fullName } as any)));
    });

    return () => { unsubF(); unsubM(); };
  }, [user]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-blue-400 mb-6 border border-blue-100 shadow-inner">
          <Wallet size={40} />
        </div>
        <h2 className="text-2xl font-display font-black text-text-main mb-2">Acceso a Tesorería</h2>
        <p className="text-text-muted max-w-xs mx-auto mb-8">La información financiera requiere autenticación para su visualización.</p>
      </div>
    );
  }

  const handleOpenModal = (record?: FinancialRecord) => {
    if (record) {
      setEditingRecord(record);
      const recordDate = record.date instanceof Timestamp ? record.date.toDate() : new Date(record.date);
      setFormData({
        type: record.type,
        category: record.category || 'Diezmos',
        subcategory: record.subcategory || '',
        amount: record.amount.toString(),
        cashAmount: record.cashAmount?.toString() || '0',
        transferAmount: record.transferAmount?.toString() || '0',
        contributorName: record.contributorName || '',
        description: record.description || '',
        date: format(recordDate, 'yyyy-MM-dd'),
        memberId: record.memberId || ''
      });
    } else {
      setEditingRecord(null);
      setFormData({ 
        type: 'income', 
        category: 'Diezmos', 
        subcategory: '', 
        amount: '', 
        cashAmount: '', 
        transferAmount: '', 
        contributorName: '', 
        description: '', 
        date: format(new Date(), 'yyyy-MM-dd'), 
        memberId: '' 
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !church) return;

    try {
      const totalAmount = (parseFloat(formData.cashAmount) || 0) + (parseFloat(formData.transferAmount) || 0) || parseFloat(formData.amount) || 0;
      
      const data = {
        churchId: church.id,
        adminEmails: church.adminEmails,
        type: formData.type,
        amount: totalAmount,
        cashAmount: parseFloat(formData.cashAmount) || 0,
        transferAmount: parseFloat(formData.transferAmount) || 0,
        category: formData.category,
        subcategory: formData.subcategory,
        contributorName: formData.contributorName,
        description: formData.description,
        date: Timestamp.fromDate(new Date(formData.date + 'T12:00:00')), // Avoid timezone shift
        memberId: formData.memberId || null,
        updatedAt: serverTimestamp()
      };

      if (editingRecord) {
        await setDoc(doc(db, 'financials', editingRecord.id), data, { merge: true });
      } else {
        await addDoc(collection(db, 'financials'), {
          ...data,
          createdAt: serverTimestamp(),
          createdBy: user?.uid
        });
      }

      setIsModalOpen(false);
      setEditingRecord(null);
      setFormData({ 
        type: 'income', 
        category: 'Diezmos', 
        subcategory: '', 
        amount: '', 
        cashAmount: '', 
        transferAmount: '', 
        contributorName: '', 
        description: '', 
        date: format(new Date(), 'yyyy-MM-dd'), 
        memberId: '' 
      });
    } catch (error) {
      handleFirestoreError(error, editingRecord ? OperationType.UPDATE : OperationType.CREATE, 'financials');
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin || !window.confirm('¿Eliminar este registro?')) return;
    try {
      await deleteDoc(doc(db, 'financials', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `financials/${id}`);
    }
  };

  const filteredRecords = records.filter(record => {
    const recordDate = record.date instanceof Timestamp ? record.date.toDate() : new Date(record.date);
    const monthMatch = recordDate.getMonth() + 1 === filterMonth;
    const yearMatch = recordDate.getFullYear() === filterYear;
    const typeMatch = filterType === 'all' || record.type === filterType;
    
    const searchLower = searchTerm.toLowerCase();
    const searchMatch = !searchTerm || 
      record.category.toLowerCase().includes(searchLower) ||
      (record.subcategory || '').toLowerCase().includes(searchLower) ||
      (record.description || '').toLowerCase().includes(searchLower) ||
      (record.contributorName || '').toLowerCase().includes(searchLower);

    return monthMatch && yearMatch && typeMatch && searchMatch;
  });

  const totalIncome = filteredRecords.filter(r => r.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = filteredRecords.filter(r => r.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
  const balance = totalIncome - totalExpense;

  const categories = formData.type === 'income' 
    ? ['Diezmos', 'Ofrendas', 'Donación Especial', 'Eventos', 'Venta de Recursos']
    : ['Servicios Públicos', 'Mantenimiento', 'Salarios', 'Misiones', 'Ayuda Social', 'Papelería', 'Eventos'];

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="text-text-main">Tesorería</h2>
          <p className="text-sm text-text-muted font-medium">Control financiero y transparencia de la obra.</p>
        </div>
        
        {isAdmin && (
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold hover:scale-[1.02] active:scale-95 transition-all text-xs uppercase tracking-widest shadow-xl shadow-primary/20"
          >
            <Plus size={18} />
            Nuevo Registro
          </button>
        )}

        {!isAdmin && (
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-500 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-slate-200">
            <Lock size={14} />
            Modo Lectura
          </div>
        )}
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-display">
        <div className="bg-gradient-to-br from-slate-900 to-blue-900 p-6 rounded-[2rem] text-white shadow-2xl flex flex-col justify-between min-h-[160px] relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
             <DollarSign size={120} />
          </div>
          <div className="flex items-center justify-between relative z-10">
            <p className="text-[10px] uppercase font-bold tracking-widest opacity-60">Balance General</p>
            <DollarSign className="opacity-40" size={20} />
          </div>
          <p className="text-3xl md:text-4xl font-black relative z-10">
            ${balance.toLocaleString('es-CL')}
          </p>
          <div className="bg-white/10 self-start px-2 py-1 rounded text-[8px] font-bold uppercase tracking-widest relative z-10 backdrop-blur-sm">Caja Consolidada</div>
        </div>

        <div className="bento-card border-emerald-100 bg-emerald-50/10 flex flex-col justify-between min-h-[160px] hover:border-emerald-200">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase font-bold tracking-widest text-emerald-600">Ingresos Totales</p>
            <div className="p-2 bg-emerald-50 rounded-xl">
              <TrendingUp className="text-emerald-500" size={18} />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-black text-text-main">${totalIncome.toLocaleString('es-CL')}</p>
          <div className="bg-emerald-50 self-start badge-pill badge-pill-emerald border-none">Este Periodo</div>
        </div>

        <div className="bento-card border-rose-100 bg-rose-50/10 flex flex-col justify-between min-h-[160px] hover:border-rose-200">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase font-bold tracking-widest text-rose-600">Gastos Totales</p>
            <div className="p-2 bg-rose-50 rounded-xl">
              <TrendingDown className="text-rose-500" size={18} />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-black text-text-main">${totalExpense.toLocaleString('es-CL')}</p>
          <div className="bg-rose-50 self-start badge-pill badge-pill-rose border-none">Mantenimiento</div>
        </div>
      </div>

      {/* Transaction List - Redesigned Card Style */}
      <div className="mt-8 bento-card !p-8 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
           <h3 className="text-xl md:text-2xl font-display font-black text-text-main tracking-tight">Movimientos del Periodo</h3>
           <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <select 
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(parseInt(e.target.value))}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 bg-white focus:ring-2 focus:ring-primary/10 transition-all outline-none"
                >
                  {months.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <select 
                  value={filterYear}
                  onChange={(e) => setFilterYear(parseInt(e.target.value))}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 bg-white focus:ring-2 focus:ring-primary/10 transition-all outline-none"
                >
                  {years.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div className="flex bg-slate-100 p-1 rounded-xl">
                {(['all', 'income', 'expense'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      filterType === type 
                        ? 'bg-white text-text-main shadow-sm' 
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {type === 'all' ? 'Todos' : type === 'income' ? 'Ingresos' : 'Egresos'}
                  </button>
                ))}
              </div>
           </div>
        </div>

        <div className="relative mb-6 group">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" />
          <input 
            type="text"
            placeholder="Buscar por descripción o aportante..."
            className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-[1.5rem] border border-slate-200 focus:ring-2 focus:ring-primary/10 transition-all font-medium text-sm text-text-main placeholder:text-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="space-y-4">
          {filteredRecords.map(record => {
            const member = members.find(m => m.id === record.memberId);
            return (
              <div 
                key={record.id} 
                className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white rounded-[1.5rem] border border-slate-100 hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-300"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${record.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {record.type === 'income' ? <ArrowUpCircle size={24} /> : <ArrowDownCircle size={24} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-display font-bold text-sm text-text-main uppercase tracking-tight">{record.category}</h4>
                      {record.subcategory && (
                        <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[8px] font-black uppercase tracking-widest border border-blue-100 border-dashed">
                          {record.subcategory}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-[9px] font-bold text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar size={10} className="opacity-60" />
                        {record.date instanceof Timestamp ? format(record.date.toDate(), 'dd-MM-yyyy') : record.date}
                      </span>
                      {member && (
                        <span className="flex items-center gap-1">
                          <div className="w-1 h-1 rounded-full bg-slate-200" />
                          {member.fullName}
                        </span>
                      )}
                      <span className="flex items-center gap-1 opacity-80 max-w-[200px] truncate">
                         {record.description}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 sm:mt-0 flex items-center justify-between sm:justify-end gap-3">
                   <div className="text-right">
                      <p className={`text-xl font-display font-black ${record.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {record.type === 'income' ? '+' : '-'} ${record.amount.toLocaleString('es-CL')}
                      </p>
                      <p className="text-[7px] uppercase font-bold tracking-widest text-slate-300 leading-none">{record.type === 'income' ? 'Ingreso Verificado' : 'Egreso Confirmado'}</p>
                   </div>
                   <div className="flex items-center gap-1 ml-2">
                      <button 
                        onClick={() => setViewingReceipt(record)}
                        className="p-2 text-slate-300 hover:text-primary hover:bg-blue-50 rounded-xl transition-all active:scale-95"
                        title="Ver Comprobante"
                      >
                        <ClipboardCheck size={18} />
                      </button>
                      {isAdmin && (
                        <>
                          <button 
                            onClick={() => handleOpenModal(record)}
                            className="p-2 text-slate-300 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all active:scale-95"
                            title="Editar"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => handleDelete(record.id)}
                            className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all active:scale-95"
                            title="Eliminar"
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                   </div>
                </div>
              </div>
            );
          })}
          
          {filteredRecords.length === 0 && !loading && (
            <div className="py-20 text-center bg-slate-50 rounded-[3rem] border border-slate-100 border-dashed">
               <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Calculator size={32} className="text-slate-200" />
               </div>
               <p className="text-sm text-slate-400 font-medium italic">No se registran movimientos con los filtros seleccionados.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className={`w-full max-w-xl rounded-3xl md:rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col transition-colors duration-500 ${
              formData.type === 'income' ? 'bg-green-50' : 'bg-red-50'
            }`}
          >
            <div className="flex items-center justify-between p-5 sm:p-8">
              <h3 className={`text-base sm:text-2xl font-display font-bold transition-colors duration-300 ${formData.type === 'income' ? 'text-emerald-700' : 'text-rose-700'}`}>
                {editingRecord ? 'Editar' : 'Registrar'} {formData.type === 'income' ? 'Ingreso' : 'Egreso'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-900 rounded-full hover:bg-white/50 transition-all"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 sm:p-8 pt-0 space-y-4 sm:space-y-6 overflow-y-auto flex-1 no-scrollbar text-text-main">
              {/* Main Categories */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                {['Diezmos', 'Ofrendas', 'Votos', 'Gastos'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      const type = cat === 'Gastos' ? 'expense' : 'income';
                      setFormData({ ...formData, category: cat, type, subcategory: '' });
                    }}
                    className={`py-2.5 md:py-4 rounded-xl md:rounded-[1.5rem] text-xs md:text-base font-bold transition-all border-2 ${
                      formData.category === cat 
                        ? 'border-slate-900 bg-white text-slate-900 shadow-xl' 
                        : 'border-white/50 text-slate-400 hover:border-white shadow-sm'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Subcategories */}
              {formData.category && (
                <div className="bg-white/40 backdrop-blur-sm p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-white/60 min-h-[80px]">
                  {formData.category === 'Diezmos' && (
                    <div className="flex flex-wrap gap-2">
                      {['Ingreso Diezmo', 'Diezmo 10%', 'FOSP 7%', 'Pastor'].map(sub => (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => setFormData({ ...formData, subcategory: sub })}
                          className={`px-3 py-1.5 rounded-lg text-[10px] md:text-sm font-bold transition-all ${
                            formData.subcategory === sub ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-100'
                          }`}
                        >
                          {sub}
                        </button>
                      ))}
                    </div>
                  )}
                  {formData.category === 'Votos' && (
                    <div className="flex flex-wrap gap-2">
                      {['Pro Arriendo', 'Ayuda Nac.', 'Voto General'].map(sub => (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => setFormData({ ...formData, subcategory: sub })}
                          className={`px-3 py-1.5 rounded-lg text-[10px] md:text-sm font-bold transition-all ${
                            formData.subcategory === sub ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-100'
                          }`}
                        >
                          {sub}
                        </button>
                      ))}
                    </div>
                  )}
                  {formData.category === 'Gastos' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[9px] uppercase font-bold tracking-widest text-slate-400 mb-2">Servicios / Local</p>
                        <div className="flex flex-wrap gap-1.5">
                          {['Luz', 'Agua', 'Internet', 'Arriendo'].map(sub => (
                            <button
                              key={sub}
                              type="button"
                              onClick={() => setFormData({ ...formData, subcategory: sub })}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                formData.subcategory === sub ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-100'
                              }`}
                            >
                              {sub}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase font-bold tracking-widest text-slate-400 mb-2">Operación</p>
                        <div className="flex flex-wrap gap-1.5">
                          {['Viáticos', 'Varios'].map(sub => (
                            <button
                              key={sub}
                              type="button"
                              onClick={() => setFormData({ ...formData, subcategory: sub })}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                formData.subcategory === sub ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-100'
                              }`}
                            >
                              {sub}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  {formData.category === 'Ofrendas' && (
                    <div className="space-y-4">
                      {config?.missionaryDays && config.missionaryDays.length > 0 && (
                        <div>
                          <p className="text-[9px] uppercase font-bold tracking-widest text-slate-400 mb-2">Días Misioneros</p>
                          <div className="flex flex-wrap gap-1.5">
                            {config.missionaryDays.map(day => (
                              <button
                                key={day.name}
                                type="button"
                                onClick={() => setFormData({ ...formData, subcategory: day.name })}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                  formData.subcategory === day.name ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-100'
                                }`}
                              >
                                {day.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {config?.specialServices && config.specialServices.length > 0 && (
                        <div>
                          <p className="text-[9px] uppercase font-bold tracking-widest text-slate-400 mb-2">Servicios Especiales</p>
                          <div className="flex flex-wrap gap-1.5">
                            {config.specialServices.map(service => (
                              <button
                                key={service.name}
                                type="button"
                                onClick={() => setFormData({ ...formData, subcategory: service.name })}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                  formData.subcategory === service.name ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-100'
                                }`}
                              >
                                {service.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Date and Contributor */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="date"
                    className="w-full pl-10 pr-4 py-3 md:py-4 bg-white/60 rounded-xl md:rounded-2xl border-2 border-transparent focus:border-white transition-all text-xs md:text-sm font-bold text-slate-700"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Aportante (Opcional)"
                    className="w-full pl-10 pr-4 py-3 md:py-4 bg-white/60 rounded-xl md:rounded-2xl border-2 border-transparent focus:border-white transition-all text-xs md:text-sm font-bold text-slate-700 placeholder:text-slate-400"
                    value={formData.contributorName}
                    onChange={e => setFormData({ ...formData, contributorName: e.target.value })}
                  />
                </div>
              </div>

              {/* Breakdown Selection */}
              <div className="bg-white/40 backdrop-blur-sm p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-white/60">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-[9px] uppercase font-black tracking-widest text-slate-500">Canal de Movimiento</p>
                  <div className="badge-pill badge-pill-primary flex items-center gap-1 shadow-sm">
                    <TrendingUp size={9} /> Tesorería Digital
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-tight">
                      <DollarSign size={10} /> Efectivo
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      className="w-full px-4 md:px-6 py-2.5 md:py-4 bg-white rounded-xl md:rounded-[1.2rem] border border-slate-100 text-lg md:text-xl font-display font-black text-slate-700 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                      value={formData.cashAmount}
                      onChange={e => setFormData({ ...formData, cashAmount: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-tight">
                      <Wallet size={10} /> Transf.
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      className="w-full px-4 md:px-6 py-2.5 md:py-4 bg-white rounded-xl md:rounded-[1.2rem] border border-slate-100 text-lg md:text-xl font-display font-black text-slate-700 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                      value={formData.transferAmount}
                      onChange={e => setFormData({ ...formData, transferAmount: e.target.value })}
                    />
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-white/40 flex justify-between items-center">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Estimado:</span>
                  <span className={`text-lg md:text-xl font-display font-black transition-colors duration-300 ${formData.type === 'income' ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {formData.type === 'income' ? '+' : '-'} ${((parseFloat(formData.cashAmount) || 0) + (parseFloat(formData.transferAmount) || 0)).toLocaleString('es-CL')}
                  </span>
                </div>
              </div>

              <div className="pb-4">
                <button
                  type="submit"
                  className={`w-full py-4 md:py-5 text-white rounded-xl md:rounded-[1.5rem] font-bold text-base md:text-lg transition-all shadow-xl active:scale-95 ${
                    formData.type === 'income' 
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200/50' 
                      : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200/50'
                  }`}
                >
                  {editingRecord ? 'Actualizar' : 'Confirmar'} {formData.type === 'income' ? 'Ingreso' : 'Egreso'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Digital Receipt Modal */}
      {viewingReceipt && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden text-text-main"
          >
            <div className="relative p-6 sm:p-10 bg-gradient-to-br from-blue-50 to-white border-b border-blue-50 flex flex-col items-center">
              <button 
                onClick={() => setViewingReceipt(null)}
                className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-900 transition-colors"
              >
                <X size={20} />
              </button>
              
              <div className="w-20 h-20 bg-white rounded-3xl shadow-xl shadow-blue-500/10 flex items-center justify-center mb-6 border border-blue-100/50">
                <Shield className="text-primary" size={40} />
              </div>
              <h3 className="text-xl md:text-2xl font-display font-black uppercase tracking-tight text-slate-900 text-center leading-tight">{church?.name}</h3>
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mt-2">Comprobante Digital</p>
            </div>
            
            <div className="p-6 sm:p-10 space-y-6 sm:space-y-8">
              <div className="text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Monto de la Operación</p>
                <p className={`text-3xl md:text-5xl font-display font-black ${viewingReceipt.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  ${viewingReceipt.amount.toLocaleString('es-CL')}
                </p>
              </div>

              <div className="p-8 bg-slate-50/50 rounded-[2rem] space-y-5 border border-slate-100">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Fecha emisión</span>
                  <span className="text-sm font-bold">
                    {viewingReceipt.date instanceof Timestamp 
                      ? format(viewingReceipt.date.toDate(), 'dd-MM-yyyy') 
                      : viewingReceipt.date}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Concepto Principal</span>
                  <span className="text-sm font-bold">{viewingReceipt.category} {viewingReceipt.subcategory && `/ ${viewingReceipt.subcategory}`}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Aportante / Recibe</span>
                  <span className="text-sm font-bold truncate max-w-[200px]">
                    {viewingReceipt.contributorName || members.find(m => m.id === viewingReceipt.memberId)?.fullName || 'General'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Medio de pago</span>
                  <div className="flex gap-2">
                    {viewingReceipt.cashAmount > 0 && <span className="badge-pill badge-pill-slate bg-white">EFECTIVO</span>}
                    {viewingReceipt.transferAmount > 0 && <span className="badge-pill badge-pill-slate bg-white">TRANSF.</span>}
                  </div>
                </div>
              </div>

              <div className="text-center space-y-4">
                <p className="text-[12px] font-medium text-slate-500 italic px-4">"{viewingReceipt.description || 'Sin descripción adicional en el registro.'}"</p>
                <div className="pt-6 flex flex-col items-center">
                  <div className="w-16 h-1.5 bg-primary/20 rounded-full mb-3"></div>
                  <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] opacity-50">Sello de Seguridad Ecclesia</p>
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-900 flex gap-4">
              <button 
                onClick={() => window.print()}
                className="flex-1 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
              >
                Imprimir
              </button>
              <button 
                onClick={() => setViewingReceipt(null)}
                className="flex-1 py-4 bg-white text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl hover:scale-[1.02] active:scale-95"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
