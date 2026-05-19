import React, { useState, useEffect } from 'react';
import { 
  collection,
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
  orderBy,
  where 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Member, Relationship, RelationshipType } from '../../types';
import { useAuth } from '../AuthProvider';
import { 
  Plus, 
  Search, 
  UserPlus, 
  Edit2, 
  Trash2, 
  UserCheck, 
  Flame, 
  Droplets,
  ShieldCheck,
  X,
  Filter,
  Users,
  Lock,
  Camera,
  Phone,
  Mail,
  MapPin,
  CalendarDays,
  MoreHorizontal,
  Smile,
  Backpack,
  Heart,
  Link,
  ChevronRight,
  Mars,
  Venus
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MemberSegment } from '../../types';
import { motion } from 'motion/react';

const getSegmentPlural = (segment: MemberSegment | 'Todos') => {
  if (segment === 'Todos') return 'Todos';
  switch (segment) {
    case 'Niño': return 'Niños';
    case 'Adolescente': return 'Adolescentes';
    case 'Joven': return 'Jóvenes';
    case 'Adulto': return 'Adultos';
    default: return segment;
  }
};

const relationshipLabels: Record<RelationshipType, string> = {
  parent: 'Padre/Madre',
  child: 'Hijo/a',
  sibling: 'Hermano/a',
   spouse: 'Cónyuge',
  cousin: 'Primo/a',
  other: 'Otro'
};

export const MemberManagement: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSegment, setActiveSegment] = useState<MemberSegment | 'Todos'>('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingMember, setViewingMember] = useState<Member | null>(null);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [memberRelationships, setMemberRelationships] = useState<{rel: Relationship, member: Member}[]>([]);
  const [relSearchTerm, setRelSearchTerm] = useState('');
  const [selectedRelMember, setSelectedRelMember] = useState<Member | null>(null);
  const [selectedRelType, setSelectedRelType] = useState<RelationshipType>('other');
  const { user, isAdmin, church } = useAuth();

  const segments: MemberSegment[] = ['Niño', 'Adolescente', 'Joven', 'Adulto'];

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    gender: 'F' as 'M' | 'F',
    photoUrl: '',
    segment: 'Adulto' as MemberSegment,
    status: 'Activo' as 'Activo' | 'Inactivo' | 'Trasladado',
    birthDate: '',
    isBaptized: false,
    baptismDate: '',
    hasHolySpiritSeal: false,
    holySpiritSealDate: '',
    isServer: false,
    serverRole: '',
    email: '',
    phone: '',
    address: '',
    notes: ''
  });

  useEffect(() => {
    if (!user || !church) {
      setMembers([]);
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, 'members'), 
      where('churchId', '==', church.id),
      where('adminEmails', 'array-contains', user.email?.toLowerCase()),
      orderBy('fullName', 'asc')
    );
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Member));
        setMembers(docs);
        setLoading(false);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'members')
    );
    return unsubscribe;
  }, [user, church]);

  // Fetch relationships for current member (editing or viewing)
  const activeMember = editingMember || viewingMember;
  useEffect(() => {
    if (!activeMember || !church) {
      setMemberRelationships([]);
      return;
    }

    const q = query(
      collection(db, 'relationships'),
      where('churchId', '==', church.id),
      where('adminEmails', 'array-contains', user.email?.toLowerCase())
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allRels = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Relationship));
      const filteredRels = allRels.filter(r => r.memberId1 === activeMember.id || r.memberId2 === activeMember.id);

      const mappedRels = filteredRels.map(rel => {
        const otherMemberId = rel.memberId1 === activeMember.id ? rel.memberId2 : rel.memberId1;
        const otherMember = members.find(m => m.id === otherMemberId);
        return otherMember ? { rel, member: otherMember } : null;
      }).filter(Boolean) as {rel: Relationship, member: Member}[];

      setMemberRelationships(mappedRels);
    });

    return unsubscribe;
  }, [activeMember?.id, members]);

  // Auto-segment assignment based on age
  useEffect(() => {
    if (!formData.birthDate) return;
    
    const birthDate = new Date(formData.birthDate);
    // Add offset for timezone issues if necessary, but standard YYYY-MM-DD to Date usually works well for local age
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    let newSegment: MemberSegment = 'Adulto';
    if (age <= 12) newSegment = 'Niño';
    else if (age <= 17) newSegment = 'Adolescente';
    else if (age <= 28) newSegment = 'Joven';
    
    if (newSegment !== formData.segment) {
      setFormData(prev => ({ ...prev, segment: newSegment }));
    }
  }, [formData.birthDate]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-6">
          <Users size={40} />
        </div>
        <h2 className="text-2xl font-display font-black text-slate-900 mb-2">Acceso Restringido</h2>
        <p className="text-text-muted max-w-xs mx-auto mb-8">Debes iniciar sesión para visualizar y gestionar la membresía de la iglesia.</p>
      </div>
    );
  }

  const handleOpenModal = (member?: Member) => {
    if (member) {
      setEditingMember(member);
      setFormData({
        fullName: member.fullName,
        gender: member.gender || 'F',
        photoUrl: member.photoUrl || '',
        segment: member.segment || 'Adulto',
        status: member.status || 'Activo',
        birthDate: member.birthDate || '',
        isBaptized: member.isBaptized,
        baptismDate: member.baptismDate || '',
        hasHolySpiritSeal: member.hasHolySpiritSeal,
        holySpiritSealDate: member.holySpiritSealDate || '',
        isServer: member.isServer,
        serverRole: member.serverRole || '',
        email: member.email || '',
        phone: member.phone || '',
        address: member.address || '',
        notes: member.notes || ''
      });
    } else {
      setEditingMember(null);
      setFormData({
        fullName: '',
        gender: 'F',
        photoUrl: '',
        segment: 'Adulto',
        status: 'Activo',
        birthDate: '',
        isBaptized: false,
        baptismDate: '',
        hasHolySpiritSeal: false,
        holySpiritSealDate: '',
        isServer: false,
        serverRole: '',
        email: '',
        phone: '',
        address: '',
        notes: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !church) return;

    try {
      const data = {
        ...formData,
        churchId: church.id,
        adminEmails: church.adminEmails,
        updatedAt: serverTimestamp(),
      };

      if (editingMember) {
        await updateDoc(doc(db, 'members', editingMember.id), data);
      } else {
        await addDoc(collection(db, 'members'), {
          ...data,
          createdAt: serverTimestamp(),
        });
      }
      setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, editingMember ? OperationType.UPDATE : OperationType.CREATE, 'members');
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin || !window.confirm('¿Estás seguro de eliminar este miembro?')) return;
    try {
      await deleteDoc(doc(db, 'members', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `members/${id}`);
    }
  };

  const handleAddRelationship = async () => {
    if (!isAdmin || !editingMember || !selectedRelMember || !church) return;
    try {
      await addDoc(collection(db, 'relationships'), {
        churchId: church.id,
        adminEmails: church.adminEmails,
        memberId1: editingMember.id,
        memberId2: selectedRelMember.id,
        type: selectedRelType,
        createdAt: serverTimestamp()
      });
      setSelectedRelMember(null);
      setRelSearchTerm('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'relationships');
    }
  };

  const handleDeleteRelationship = async (relId: string) => {
    if (!isAdmin || !window.confirm('¿Eliminar este parentezco?')) return;
    try {
      await deleteDoc(doc(db, 'relationships', relId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `relationships/${relId}`);
    }
  };

  const filteredMembers = members.filter(m => {
    const matchesSearch = m.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.phone?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSegment = activeSegment === 'Todos' || m.segment === activeSegment;
    
    return matchesSearch && matchesSegment;
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-text-main">Directorio de Miembros</h2>
          <p className="text-text-muted mt-1 font-medium">Gestión integral y seguimiento de la congregación.</p>
        </div>
        
        <div className="flex items-center gap-3">
          {!isAdmin && (
            <div className="badge-pill badge-pill-slate">
              <Lock size={10} className="mr-1 inline" />
              Modo Lectura
            </div>
          )}
          {isAdmin && (
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center justify-center gap-2 px-7 py-3.5 bg-slate-900 text-white rounded-2xl font-black hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-slate-200"
            >
              <UserPlus size={18} />
              <span>Añadir Miembro</span>
            </button>
          )}
        </div>
      </header>

      {/* CRM Tools: Search + Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 w-full relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={20} />
          <input
            type="text"
            placeholder="Buscar por nombre, correo o celular..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white rounded-[1.5rem] border-2 border-transparent focus:border-blue-500/20 shadow-sm focus:shadow-blue-500/10 transition-all font-medium text-slate-700"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto p-1 bg-slate-100 rounded-[1.5rem]">
          <button
            onClick={() => setActiveSegment('Todos')}
            className={`flex-1 md:flex-none px-6 py-3 rounded-[1.2rem] text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${
              activeSegment === 'Todos' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Todos
          </button>
          {segments.map(seg => (
            <button
              key={seg}
              onClick={() => setActiveSegment(seg)}
              className={`flex-1 md:flex-none px-6 py-3 rounded-[1.2rem] text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${
                activeSegment === seg 
                  ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {getSegmentPlural(seg)}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Miembros', value: members.length, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Adultos', value: members.filter(m => m.segment === 'Adulto').length, icon: UserCheck, color: 'text-slate-600', bg: 'bg-slate-50' },
          { label: 'Jóvenes', value: members.filter(m => m.segment === 'Joven').length, icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50' },
          { label: 'Adolescentes', value: members.filter(m => m.segment === 'Adolescente').length, icon: Backpack, color: 'text-cyan-500', bg: 'bg-cyan-50' },
          { label: 'Niños', value: members.filter(m => m.segment === 'Niño').length, icon: Smile, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Servidores', value: members.filter(m => m.isServer).length, icon: ShieldCheck, color: 'text-indigo-500', bg: 'bg-indigo-50' }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-50 shadow-sm hover:shadow-md transition-shadow">
            <div className={`p-3 w-fit rounded-2xl ${stat.bg} ${stat.color} mb-4`}>
              <stat.icon size={20} />
            </div>
            <p className="text-[10px] uppercase font-black tracking-widest text-text-muted">{stat.label}</p>
            <p className="text-3xl font-display font-black text-text-main">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* CRM Directory Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 space-y-4">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-16 bg-slate-50 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-50">
                  <th className="px-4 sm:px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Miembro</th>
                  <th className="hidden sm:table-cell px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Segmento</th>
                  <th className="hidden md:table-cell px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Estado</th>
                  <th className="hidden lg:table-cell px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Contacto</th>
                  <th className="hidden lg:table-cell px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Cumpleaños</th>
                  {isAdmin && <th className="px-4 sm:px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map(member => (
                  <tr key={member.id} className="group hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 cursor-pointer" onClick={() => setViewingMember(member)}>
                    <td className="px-4 sm:px-8 py-2">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center overflow-hidden border border-blue-100 shadow-sm transition-transform group-hover:scale-105">
                            {member.photoUrl ? (
                              <img src={member.photoUrl} alt={member.fullName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <span className="text-sm font-display font-black text-blue-300">{member.fullName.charAt(0)}</span>
                            )}
                          </div>
                          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-xl border-2 border-white shadow-sm transition-transform group-hover:scale-110 ${
                            member.gender === 'M' ? 'bg-blue-500' : 'bg-rose-500'
                          } flex items-center justify-center text-[5px] text-white`}>
                            {member.gender === 'M' ? <Mars size={8} /> : <Venus size={8} />}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 group-hover:text-primary transition-colors tracking-tight">{member.fullName}</p>
                          <p className="text-[10px] text-slate-400 font-bold lowercase leading-none mt-0.5">{member.email || 'sin correo registrado'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-2">
                      <span className={`badge-pill ${
                        member.segment === 'Adulto' ? 'badge-pill-slate' :
                        member.segment === 'Joven' ? 'badge-pill-primary' :
                        member.segment === 'Adolescente' ? 'badge-pill-primary/50' :
                        'badge-pill-emerald'
                      }`}>
                        {member.segment}
                      </span>
                    </td>
                    <td className="hidden md:table-cell px-4 py-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          member.status === 'Activo' ? 'bg-green-500' : member.status === 'Inactivo' ? 'bg-slate-300' : 'bg-cyan-500'
                        }`} />
                        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tight">{member.status}</span>
                      </div>
                    </td>
                    <td className="hidden lg:table-cell px-4 py-2">
                      <div className="flex flex-col gap-0">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Phone size={9} />
                          <span className="text-[10px] font-bold text-slate-700">{member.phone || '---'}</span>
                        </div>
                        {member.isServer && (
                          <div className="flex items-center gap-1.5 text-indigo-500">
                            <ShieldCheck size={9} />
                            <span className="text-[8px] font-black uppercase tracking-widest">{member.serverRole || 'Servidor'}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="hidden lg:table-cell px-4 py-2">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <CalendarDays size={9} />
                        <span className="text-[10px] font-bold text-slate-700">
                          {member.birthDate ? format(new Date(member.birthDate), 'dd MMM', { locale: es }) : '---'}
                        </span>
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="px-4 sm:px-8 py-2 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-1 group-hover:translate-x-0">
                          <button 
                            onClick={() => handleOpenModal(member)}
                            className="p-2 bg-white text-slate-400 hover:text-slate-900 rounded-lg border border-transparent hover:border-slate-100 transition-all shadow-sm"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button 
                            onClick={() => handleDelete(member.id)}
                            className="p-2 bg-white text-slate-400 hover:text-red-500 rounded-lg border border-transparent hover:border-slate-100 transition-all shadow-sm"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredMembers.length === 0 && (
              <div className="py-20 text-center">
                <p className="text-slate-400 font-medium">No se encontraron miembros con los filtros aplicados.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Member Detail Modal */}
      {viewingMember && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header / Cover */}
            <div className="h-32 bg-slate-900 relative">
              <button 
                onClick={() => setViewingMember(null)}
                className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-10"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-8 pb-8 -mt-16 relative flex-1 overflow-y-auto no-scrollbar">
              <div className="flex flex-col md:flex-row gap-6 items-start mb-10">
                <div className="w-32 h-32 rounded-[2.5rem] bg-slate-50 border-4 border-white shadow-2xl overflow-hidden shrink-0 group hover:scale-105 transition-transform">
                  {viewingMember.photoUrl ? (
                    <img src={viewingMember.photoUrl} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl font-display font-black text-blue-200">
                      {viewingMember.fullName.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="pt-16 md:pt-4">
                  <h2 className="text-slate-900 tracking-tight">{viewingMember.fullName}</h2>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="badge-pill badge-pill-slate">{viewingMember.segment}</span>
                    <span className={`badge-pill ${
                      viewingMember.status === 'Activo' ? 'badge-pill-emerald' : 'badge-pill-slate'
                    }`}>{viewingMember.status}</span>
                    <span className={`badge-pill ${
                      viewingMember.gender === 'M' ? 'badge-pill-primary' : 'badge-pill-rose'
                    }`}>
                      {viewingMember.gender === 'M' ? 'Hombre' : 'Mujer'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Column 1: Info */}
                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Contacto & Básicos</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400"><Mail size={14}/></div>
                        <span className="text-slate-600 truncate">{viewingMember.email || 'No registrado'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400"><Phone size={14}/></div>
                        <span className="text-slate-600">{viewingMember.phone || 'No registrado'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400"><MapPin size={14}/></div>
                        <span className="text-slate-600">{viewingMember.address || 'No registrado'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400"><CalendarDays size={14}/></div>
                        <span className="text-slate-600">
                          {viewingMember.birthDate ? format(new Date(viewingMember.birthDate), 'dd MMMM, yyyy', { locale: es }) : 'No registrado'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {viewingMember.notes && (
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Observaciones</h4>
                      <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-2xl italic leading-relaxed">
                        "{viewingMember.notes}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Column 2: Spiritual & Family */}
                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Vida Espiritual</h4>
                    <div className="grid grid-cols-1 gap-2">
                      <div className={`flex items-center justify-between p-3 rounded-2xl border ${viewingMember.isBaptized ? 'border-indigo-100 bg-indigo-50/50' : 'border-slate-100 opacity-60'}`}>
                        <div className="flex items-center gap-3">
                          <Droplets size={16} className={viewingMember.isBaptized ? 'text-indigo-500' : 'text-slate-300'} />
                          <span className={`text-[11px] font-black uppercase tracking-widest ${viewingMember.isBaptized ? 'text-indigo-900' : 'text-slate-400'}`}>Bautizado</span>
                        </div>
                        {viewingMember.isBaptized && <p className="text-[10px] font-bold text-indigo-400">{viewingMember.baptizedDate || 'Fecha desconocida'}</p>}
                      </div>
                      
                      <div className={`flex items-center justify-between p-3 rounded-2xl border ${viewingMember.hasHolySpiritSeal ? 'border-teal-100 bg-teal-50/50' : 'border-slate-100 opacity-60'}`}>
                        <div className="flex items-center gap-3">
                          <Flame size={16} className={viewingMember.hasHolySpiritSeal ? 'text-teal-500' : 'text-slate-300'} />
                          <span className={`text-[11px] font-black uppercase tracking-widest ${viewingMember.hasHolySpiritSeal ? 'text-teal-900' : 'text-slate-400'}`}>Sello E.S.</span>
                        </div>
                      </div>

                      <div className={`flex items-center justify-between p-3 rounded-2xl border ${viewingMember.isServer ? 'border-emerald-100 bg-emerald-50/50' : 'border-slate-100 opacity-60'}`}>
                        <div className="flex items-center gap-3">
                          <ShieldCheck size={16} className={viewingMember.isServer ? 'text-emerald-500' : 'text-slate-300'} />
                          <span className={`text-[11px] font-black uppercase tracking-widest ${viewingMember.isServer ? 'text-emerald-900' : 'text-slate-400'}`}>Servidor</span>
                        </div>
                        {viewingMember.isServer && <p className="text-[10px] font-bold text-emerald-400">{viewingMember.serverRole || 'En funciones'}</p>}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Familia en la Iglesia</h4>
                    <div className="space-y-2">
                       {memberRelationships.length === 0 ? (
                         <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                           <p className="text-[10px] font-bold text-slate-400 uppercase">Sin vínculos registrados</p>
                         </div>
                       ) : (
                         memberRelationships.map(({ rel, member: otherMember }) => (
                           <div key={rel.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-2xl">
                             <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center font-black text-xs text-slate-300 overflow-hidden">
                                 {otherMember.photoUrl ? <img src={otherMember.photoUrl} className="w-full h-full object-cover rounded-lg" /> : otherMember.fullName.charAt(0)}
                               </div>
                               <div>
                                 <p className="text-xs font-bold text-slate-900">{otherMember.fullName}</p>
                                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{relationshipLabels[rel.type]}</p>
                               </div>
                             </div>
                           </div>
                         ))
                       )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              {isAdmin && (
                <button 
                  onClick={() => {
                    handleOpenModal(viewingMember);
                    setViewingMember(null);
                  }}
                  className="px-6 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-colors"
                >
                  Editar Miembro
                </button>
              )}
              <button 
                onClick={() => setViewingMember(null)}
                className="px-6 py-2 bg-white text-slate-600 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-colors"
              >
                Cerrar Perfil
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* CRM Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
          <div className="bg-white w-full max-w-4xl rounded-3xl md:rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 md:p-8 border-b border-slate-50">
              <div>
                <h3 className="text-lg md:text-2xl font-display font-black text-slate-900">{editingMember ? 'Perfil de Miembro' : 'Nuevo Miembro'}</h3>
                <p className="text-slate-400 text-[10px] md:text-sm font-medium">Completa la información detallada para el registro oficial.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 md:p-3 text-slate-300 hover:text-slate-900 rounded-2xl hover:bg-slate-50 transition-all font-bold"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 md:p-8 custom-scrollbar">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-12">
                {/* Visuals & Segment */}
                <div className="space-y-6 md:space-y-8">
                  <div className="flex flex-col items-center">
                    <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl md:rounded-[3rem] bg-slate-100 flex items-center justify-center border-4 border-slate-50 mb-4 group relative overflow-hidden">
                      {formData.photoUrl ? (
                        <img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Camera size={48} className="text-slate-300" />
                      )}
                      <label className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                        <span className="text-white text-xs font-bold uppercase">Cambiar</span>
                        <input 
                          type="text" 
                          placeholder="URL Foto"
                          className="absolute inset-0 opacity-0"
                          value={formData.photoUrl}
                          onChange={e => setFormData({ ...formData, photoUrl: e.target.value })}
                        />
                      </label>
                    </div>
                    <input 
                      type="text" 
                      placeholder="Pegue la URL de la imagen aquí"
                      className="w-full px-4 py-2 bg-slate-50 rounded-xl text-xs font-medium border border-slate-100 text-slate-500 mb-6"
                      value={formData.photoUrl}
                      onChange={e => setFormData({ ...formData, photoUrl: e.target.value })}
                    />

                    <div className="w-full space-y-4">
                      <div>
                        <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-2">Estado Membresía</label>
                        <div className="grid grid-cols-3 gap-2">
                          {['Activo', 'Inactivo', 'Trasladado'].map(s => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setFormData({ ...formData, status: s as any })}
                              className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                formData.status === s ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400'
                              }`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-2">Segmento</label>
                        <div className="grid grid-cols-2 gap-2">
                          {segments.map(s => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setFormData({ ...formData, segment: s })}
                              className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                formData.segment === s ? 'bg-[#4B6BFB] text-white shadow-lg shadow-[#4B6BFB]/20' : 'bg-slate-50 text-slate-400'
                              }`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Info */}
                <div className="lg:col-span-2 space-y-8 md:space-y-10">
                  <div className="space-y-4 md:space-y-6">
                    <h4 className="text-lg font-display font-black text-slate-900 flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-[#4B6BFB] rounded-full" />
                      Datos Personales
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      <div className="md:col-span-2">
                        <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-2">Nombre Completo</label>
                        <div className="flex gap-4">
                          <input
                            required
                            type="text"
                            className="flex-1 px-5 py-3 md:px-6 md:py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-slate-200 transition-all font-bold text-slate-700 text-sm"
                            value={formData.fullName}
                            onChange={e => setFormData({...formData, fullName: e.target.value})}
                            placeholder="Ej: Juan Pérez"
                          />
                          <div className="bg-slate-50 rounded-2xl p-1 flex gap-1 border-2 border-transparent">
                            {(['M', 'F'] as const).map(g => (
                              <button
                                key={g}
                                type="button"
                                onClick={() => setFormData({...formData, gender: g})}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                  formData.gender === g 
                                    ? (g === 'M' ? 'bg-blue-500 text-white shadow-lg' : 'bg-rose-500 text-white shadow-lg') 
                                    : 'bg-transparent text-slate-400 hover:text-slate-600'
                                }`}
                              >
                                {g === 'M' ? <Mars size={16} /> : <Venus size={16} />}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-2">Cumpleaños</label>
                        <div className="relative">
                          <CalendarDays size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                          <input
                            type="date"
                            className="w-full pl-12 pr-4 py-3 md:py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-slate-200 transition-all font-bold text-slate-700 text-sm"
                            value={formData.birthDate || ''}
                            onChange={e => setFormData({...formData, birthDate: e.target.value})}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-2">Celular</label>
                        <div className="relative">
                          <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                          <input
                            type="tel"
                            className="w-full pl-12 pr-4 py-3 md:py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-slate-200 transition-all font-bold text-slate-700 text-sm"
                            value={formData.phone}
                            onChange={e => setFormData({...formData, phone: e.target.value})}
                            placeholder="+56 9 1234 5678"
                          />
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-2">Email</label>
                        <div className="relative">
                          <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                          <input
                            type="email"
                            className="w-full pl-12 pr-4 py-3 md:py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-slate-200 transition-all font-bold text-slate-700 text-sm"
                            value={formData.email}
                            onChange={e => setFormData({...formData, email: e.target.value})}
                            placeholder="correo@ejemplo.com"
                          />
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-2">Dirección</label>
                        <div className="relative">
                          <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                          <input
                            type="text"
                            className="w-full pl-12 pr-4 py-3 md:py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-slate-200 transition-all font-bold text-slate-700 text-sm"
                            value={formData.address}
                            onChange={e => setFormData({...formData, address: e.target.value})}
                            placeholder="Ej. Calle Principal #123, Ciudad"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 md:space-y-6">
                    <h4 className="text-lg font-display font-black text-slate-900 flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                      Hitos Espirituales
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 p-5 md:p-8 bg-slate-50/50 rounded-3xl md:rounded-[2.5rem] border border-slate-100">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-700">¿Bautizado en Agua?</span>
                          <input 
                            type="checkbox"
                            checked={formData.isBaptized}
                            onChange={e => setFormData({...formData, isBaptized: e.target.checked})}
                            className="w-6 h-6 rounded-lg text-slate-900 border-none bg-white shadow-sm ring-slate-200 focus:ring-0"
                          />
                        </div>
                        {formData.isBaptized && (
                          <input
                            type="date"
                            className="w-full px-5 py-3 bg-white rounded-xl border border-slate-100 text-sm font-bold text-slate-700 shadow-sm"
                            value={formData.baptismDate}
                            onChange={e => setFormData({...formData, baptismDate: e.target.value})}
                          />
                        )}
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-700">¿Sello del Espíritu?</span>
                          <input 
                            type="checkbox"
                            checked={formData.hasHolySpiritSeal}
                            onChange={e => setFormData({...formData, hasHolySpiritSeal: e.target.checked})}
                            className="w-6 h-6 rounded-lg text-orange-500 border-none bg-white shadow-sm ring-slate-200 focus:ring-0"
                          />
                        </div>
                        {formData.hasHolySpiritSeal && (
                          <input
                            type="date"
                            className="w-full px-5 py-3 bg-white rounded-xl border border-slate-100 text-sm font-bold text-slate-700 shadow-sm"
                            value={formData.holySpiritSealDate}
                            onChange={e => setFormData({...formData, holySpiritSealDate: e.target.value})}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 md:space-y-6">
                    <h4 className="text-lg font-display font-black text-slate-900 flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-slate-900 rounded-full" />
                      Observaciones
                    </h4>
                    <textarea
                      rows={3}
                      className="w-full px-5 py-4 md:px-8 md:py-6 bg-slate-50 rounded-2xl md:rounded-[2.5rem] border-2 border-transparent focus:border-slate-200 transition-all font-medium text-slate-700 text-sm"
                      value={formData.notes}
                      onChange={e => setFormData({...formData, notes: e.target.value})}
                      placeholder="Notas adicionales, testimonio, requerimientos especiales..."
                    />
                  </div>

                  {editingMember && (
                    <div className="space-y-4 md:space-y-6">
                      <h4 className="text-lg font-display font-black text-slate-900 flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-rose-500 rounded-full" />
                        Relaciones Familiares
                      </h4>
                      <div className="p-5 md:p-8 bg-slate-50/50 rounded-3xl md:rounded-[2.5rem] border border-slate-100 space-y-6">
                        {/* Current Relationships */}
                        <div className="space-y-3">
                          {memberRelationships.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">No hay relaciones registradas.</p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {memberRelationships.map(({ rel, member }) => (
                                <div key={rel.id} className="bg-white p-3 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                                      {member.photoUrl ? <img src={member.photoUrl} className="w-full h-full object-cover" /> : <Users size={20} className="text-slate-300" />}
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold text-slate-900 line-clamp-1">{member.fullName}</p>
                                      <p className="text-[10px] text-rose-500 font-black uppercase tracking-widest">{relationshipLabels[rel.type]}</p>
                                    </div>
                                  </div>
                                  <button 
                                    type="button"
                                    onClick={() => handleDeleteRelationship(rel.id)}
                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Add New Relationship */}
                        {isAdmin && (
                          <div className="pt-4 border-t border-slate-100 space-y-4">
                            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Vincular Familiar</p>
                            <div className="relative">
                              <div className="flex gap-2">
                                <div className="relative flex-1">
                                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                  <input 
                                    type="text"
                                    placeholder="Buscar por nombre o apellido..."
                                    className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-slate-100 text-xs font-bold text-slate-700 focus:border-slate-300 transition-all"
                                    value={relSearchTerm}
                                    onChange={e => setRelSearchTerm(e.target.value)}
                                  />
                                  {relSearchTerm.length >= 2 && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 z-10 overflow-hidden">
                                      {members
                                        .filter(m => 
                                          m.id !== editingMember?.id && 
                                          m.fullName.toLowerCase().includes(relSearchTerm.toLowerCase()) &&
                                          !memberRelationships.some(mr => mr.member.id === m.id)
                                        )
                                        .slice(0, 5)
                                        .map(m => (
                                          <button
                                            key={m.id}
                                            type="button"
                                            onClick={() => {
                                              setSelectedRelMember(m);
                                              setRelSearchTerm('');
                                            }}
                                            className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-all text-left border-b border-slate-50 last:border-0"
                                          >
                                            <div className="flex items-center gap-3">
                                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                                                {m.photoUrl ? <img src={m.photoUrl} className="w-full h-full object-cover" /> : <Users size={16} className="text-slate-300" />}
                                              </div>
                                              <div>
                                                <p className="text-xs font-bold text-slate-900">{m.fullName}</p>
                                                <p className="text-[10px] text-slate-400">{m.segment}</p>
                                              </div>
                                            </div>
                                            <ChevronRight size={14} className="text-slate-300" />
                                          </button>
                                        ))
                                      }
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {selectedRelMember && (
                              <div className="bg-white p-4 rounded-2xl border-2 border-rose-100 flex items-center justify-between animate-in slide-in-from-top-2">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                                    {selectedRelMember.photoUrl ? <img src={selectedRelMember.photoUrl} className="w-full h-full object-cover" /> : <Users size={20} className="text-slate-300" />}
                                  </div>
                                  <div className="flex flex-col">
                                    <p className="text-xs font-bold text-slate-900">{selectedRelMember.fullName}</p>
                                    <select 
                                      className="text-[10px] font-black uppercase tracking-widest text-[#4B6BFB] bg-transparent border-none p-0 focus:ring-0 cursor-pointer"
                                      value={selectedRelType}
                                      onChange={e => setSelectedRelType(e.target.value as any)}
                                    >
                                      {Object.entries(relationshipLabels).map(([val, label]) => (
                                        <option key={val} value={val}>{label}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button type="button" onClick={() => setSelectedRelMember(null)} className="p-2 text-slate-300 hover:text-slate-900 transition-all"><X size={18} /></button>
                                  <button 
                                    type="button" 
                                    onClick={handleAddRelationship}
                                    className="px-4 py-2 bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 transition-all shadow-lg shadow-rose-100"
                                  >
                                    Vincular
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </form>

            <div className="p-5 md:p-8 border-t border-slate-50 bg-slate-50/30 flex gap-3 md:gap-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-4 md:py-5 px-4 md:px-8 bg-white border border-slate-200 text-slate-500 rounded-xl md:rounded-[2rem] font-black uppercase tracking-widest text-[10px] md:text-xs hover:bg-slate-50 transition-all"
              >
                Cerrar
              </button>
              <button
                type="submit"
                className="flex-[2] py-4 md:py-5 px-4 md:px-8 bg-[#0A1E40] text-white rounded-xl md:rounded-[2rem] font-black uppercase tracking-widest text-[10px] md:text-xs hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all active:scale-95"
              >
                {editingMember ? 'Actualizar Ficha' : 'Crear Registro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
