import React, { useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  query, 
  limit,
  Timestamp,
  where 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ChurchConfig, AdminRole } from '../../types';
import { useAuth } from '../AuthProvider';
import { 
  Settings as SettingsIcon, 
  Plus, 
  Trash2, 
  Save, 
  Calendar, 
  Clock, 
  Star, 
  Globe,
  User,
  Shield,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const ALL_ROLES: AdminRole[] = ['Administrador', 'Tesorero', 'Pastor', 'Secretario', 'Vocal', 'Servidor'];

export const Settings: React.FC = () => {
  const { user, church } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingRolesEmail, setEditingRolesEmail] = useState<string | null>(null);
  const [config, setConfig] = useState<ChurchConfig>({
    id: '',
    churchId: '',
    name: '',
    pastorName: '',
    worshipSchedule: [],
    specialServices: [],
    missionaryDays: [],
    birthdayNoticeDays: 3,
    enableBirthdayEmails: false,
    updatedAt: Timestamp.now()
  });

  const toggleRole = async (email: string, role: AdminRole) => {
    if (!church) return;
    const currentRoles = church.adminRoles?.[email] || ['Administrador'];
    let newRoles: AdminRole[] = [];
    
    if (currentRoles.includes(role)) {
      newRoles = currentRoles.filter(r => r !== role);
    } else {
      newRoles = [...currentRoles, role];
    }

    // Default to 'Administrador' if empty, or enforce at least one role
    if (newRoles.length === 0) newRoles = ['Administrador'];

    try {
      const newAdminRoles = {
        ...(church.adminRoles || {}),
        [email]: newRoles
      };
      await setDoc(doc(db, 'churches', church.id), { adminRoles: newAdminRoles }, { merge: true });
    } catch (error) {
      console.error('Error updating roles:', error);
      alert('Error al actualizar roles');
    }
  };

  useEffect(() => {
    if (!church || !user) return;
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
          const docData = querySnapshot.docs[0].data() as ChurchConfig;
          setConfig({ 
            ...docData, 
            id: querySnapshot.docs[0].id,
            birthdayNoticeDays: docData.birthdayNoticeDays ?? 3,
            enableBirthdayEmails: docData.enableBirthdayEmails ?? false
          });
        }
      } catch (error) {
        console.error('Error fetching config:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [church, user]);

  const handleSave = async () => {
    if (!church) return;
    setSaving(true);
    try {
      const docRef = config.id ? doc(db, 'config', config.id) : doc(collection(db, 'config'));
      const dataToSave = {
        ...config,
        churchId: church.id,
        adminEmails: church.adminEmails,
        updatedAt: Timestamp.now()
      };
      // id is not part of the data in firestore
      const { id, ...payload } = dataToSave;
      await setDoc(docRef, payload);
      setConfig({ ...config, id: docRef.id });
      alert('Configuración guardada correctamente');
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const addSchedule = () => {
    setConfig({
      ...config,
      worshipSchedule: [...config.worshipSchedule, { day: 'Domingo', time: '10:00' }]
    });
  };

  const removeSchedule = (index: number) => {
    const newSchedule = [...config.worshipSchedule];
    newSchedule.splice(index, 1);
    setConfig({ ...config, worshipSchedule: newSchedule });
  };

  const addService = () => {
    setConfig({
      ...config,
      specialServices: [...config.specialServices, { name: '', description: '' }]
    });
  };

  const updateService = (index: number, field: 'name' | 'description', value: string) => {
    const newList = [...config.specialServices];
    newList[index] = { ...newList[index], [field]: value };
    setConfig({ ...config, specialServices: newList });
  };

  const addMissionaryDay = () => {
    setConfig({
      ...config,
      missionaryDays: [...config.missionaryDays, { name: '', label: '' }]
    });
  };

  const updateMissionaryDay = (index: number, field: 'name' | 'label', value: string) => {
    const newList = [...config.missionaryDays];
    newList[index] = { ...newList[index], [field]: value };
    setConfig({ ...config, missionaryDays: newList });
  };

  const removeListItem = (field: 'specialServices' | 'missionaryDays', index: number) => {
    const newList = [...config[field]];
    newList.splice(index, 1);
    setConfig({ ...config, [field]: newList } as ChurchConfig);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 pb-24 text-text-main">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-slate-900 flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-2xl text-primary">
              <SettingsIcon size={24} />
            </div>
            Configuración
          </h2>
          <p className="text-text-muted mt-2 text-sm font-medium">Personaliza la información general de la iglesia</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
        >
          {saving ? 'Guardando...' : (
            <>
              <Save size={18} />
              Guardar Cambios
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Info General */}
        <section className="bg-white p-8 rounded-[2.5rem] border border-slate-50 shadow-sm space-y-6">
          <h3 className="text-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-primary">
              <User size={18} />
            </div>
            Información General
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase font-black tracking-[0.15em] text-text-muted ml-1 mb-2">Nombre de la Iglesia</label>
              <input
                type="text"
                className="w-full px-5 py-4 bg-slate-50 rounded-[1.2rem] border-2 border-transparent focus:border-blue-500/20 shadow-sm transition-all font-bold text-slate-700"
                value={config.name}
                onChange={e => setConfig({ ...config, name: e.target.value })}
                placeholder="Ej. Iglesia Central"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-black tracking-[0.15em] text-text-muted ml-1 mb-2">Nombre del Pastor</label>
              <input
                type="text"
                className="w-full px-5 py-4 bg-slate-50 rounded-[1.2rem] border-2 border-transparent focus:border-blue-500/20 shadow-sm transition-all font-bold text-slate-700"
                value={config.pastorName}
                onChange={e => setConfig({ ...config, pastorName: e.target.value })}
                placeholder="Nombre completo"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-black tracking-[0.15em] text-text-muted ml-1 mb-2">URL del Logo (Opcional)</label>
              <input
                type="text"
                className="w-full px-5 py-4 bg-slate-50 rounded-[1.2rem] border-2 border-transparent focus:border-blue-500/20 shadow-sm transition-all font-bold text-slate-700"
                value={config.logoUrl || ''}
                onChange={e => setConfig({ ...config, logoUrl: e.target.value })}
                placeholder="https://ejemplo.com/logo.png"
              />
            </div>
          </div>
        </section>

        {/* Administración de Usuarios y Roles */}
        <section className="bg-white p-8 rounded-[2.5rem] border border-slate-50 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                <Shield size={18} />
              </div>
              Roles y Accesos
            </h3>
          </div>
          <p className="text-[10px] text-text-muted uppercase font-black tracking-widest ml-1">Administradores registrados</p>
          
          <div className="space-y-4">
            {church?.adminEmails.map((email, index) => {
              const roles = church.adminRoles?.[email] || ['Administrador'];
              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group border border-slate-100/50">
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-bold text-slate-800 block truncate">{email}</span>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {roles.map(r => (
                          <span key={r} className="badge-pill badge-pill-primary border-none shadow-none">
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => setEditingRolesEmail(editingRolesEmail === email ? null : email)}
                        className={`p-2.5 rounded-xl transition-all ${editingRolesEmail === email ? 'bg-primary text-white shadow-lg' : 'bg-white text-slate-400 hover:text-slate-900 border border-slate-200'}`}
                      >
                        <SettingsIcon size={14} />
                      </button>
                      {church.adminEmails.length > 1 && (
                        <button 
                          onClick={async () => {
                            if (!window.confirm(`¿Quitar acceso a ${email}?`)) return;
                            const newEmails = church.adminEmails.filter(e => e !== email);
                            const {[email]: _, ...newAdminRoles} = church.adminRoles || {};
                            await setDoc(doc(db, 'churches', church.id), { 
                              adminEmails: newEmails,
                              adminRoles: newAdminRoles
                            }, { merge: true });
                          }}
                          className="p-2.5 bg-white text-slate-300 hover:text-red-500 rounded-xl border border-slate-200 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  <AnimatePresence>
                    {editingRolesEmail === email && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0, y: -10 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -10 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 bg-white border border-slate-100 rounded-2xl grid grid-cols-2 gap-2 mt-1 shadow-sm">
                          {ALL_ROLES.map(role => {
                            const active = roles.includes(role);
                            return (
                              <button
                                key={role}
                                onClick={() => toggleRole(email, role)}
                                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all ${
                                  active ? 'bg-primary text-white border border-primary shadow-lg shadow-primary/20' : 'bg-slate-50 text-slate-400 border border-transparent hover:bg-slate-100'
                                }`}
                              >
                                {role}
                                {active && <Check size={12} />}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            <div className="pt-4 border-t border-slate-50">
              <div className="flex gap-2 p-1 bg-slate-50 rounded-2xl">
                <input 
                  id="newAdminEmail"
                  type="email" 
                  placeholder="nuevo.admin@gmail.com"
                  className="flex-1 px-4 py-3 bg-transparent border-none text-sm font-bold placeholder:text-slate-300 focus:ring-0"
                />
                <button 
                  onClick={async () => {
                    const input = document.getElementById('newAdminEmail') as HTMLInputElement;
                    const email = input.value.trim().toLowerCase();
                    if (!email || !church) return;
                    if (church.adminEmails.includes(email)) return;
                    
                    const newEmails = [...church.adminEmails, email];
                    const newAdminRoles = {
                      ...(church.adminRoles || {}),
                      [email]: ['Administrador']
                    };
                    
                    await setDoc(doc(db, 'churches', church.id), { 
                      adminEmails: newEmails,
                      adminRoles: newAdminRoles
                    }, { merge: true });
                    
                    input.value = '';
                  }}
                  className="px-6 py-3 bg-slate-900 text-white rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest shadow-lg shadow-slate-200 active:scale-95 transition-all"
                >
                  Agregar
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Horarios de Culto */}
        <section className="bg-white p-8 rounded-[2.5rem] border border-slate-50 shadow-sm space-y-6 transition-all hover:border-slate-100">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-display font-black text-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                <Clock size={18} />
              </div>
              Días de Culto
            </h3>
            <button
              onClick={addSchedule}
              className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-emerald-50 hover:text-emerald-500 transition-all border border-slate-100/50"
            >
              <Plus size={18} />
            </button>
          </div>
          <div className="space-y-3">
            {config.worshipSchedule.map((item, index) => (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                key={index} 
                className="flex gap-2 items-center bg-slate-50/50 p-1.5 rounded-2xl border border-slate-100/30"
              >
                <select
                  className="flex-[2] px-4 py-3 bg-white rounded-xl border-none text-sm font-bold text-slate-700 shadow-sm"
                  value={item.day}
                  onChange={e => {
                    const newSchedule = [...config.worshipSchedule];
                    newSchedule[index].day = e.target.value;
                    setConfig({ ...config, worshipSchedule: newSchedule });
                  }}
                >
                  {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <input
                  type="time"
                  className="flex-1 px-4 py-3 bg-white rounded-xl border-none text-sm font-bold text-slate-700 shadow-sm"
                  value={item.time}
                  onChange={e => {
                    const newSchedule = [...config.worshipSchedule];
                    newSchedule[index].time = e.target.value;
                    setConfig({ ...config, worshipSchedule: newSchedule });
                  }}
                />
                <button
                  onClick={() => removeSchedule(index)}
                  className="p-3 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </motion.div>
            ))}
            {config.worshipSchedule.length === 0 && (
              <p className="text-center py-8 bg-slate-50 rounded-2xl text-slate-400 text-xs font-bold uppercase tracking-widest border border-dashed border-slate-200">No hay horarios registrados</p>
            )}
          </div>
        </section>

        {/* Servicios Especiales */}
        <section className="bg-white p-8 rounded-[2.5rem] border border-slate-50 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-display font-black text-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                <Star size={18} />
              </div>
              Servicios Especiales
            </h3>
            <button
              onClick={addService}
              className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-blue-50 hover:text-blue-500 transition-all border border-slate-100/50"
            >
              <Plus size={18} />
            </button>
          </div>
          <div className="space-y-4">
            {config.specialServices.map((item, index) => (
              <div key={index} className="flex flex-col gap-2 p-5 bg-slate-50/50 rounded-[1.5rem] relative border border-slate-100/50">
                <button
                  onClick={() => removeListItem('specialServices', index)}
                  className="absolute -top-2 -right-2 p-2 bg-white shadow-md border border-slate-100 text-slate-300 hover:text-red-500 rounded-xl transition-all"
                >
                  <Trash2 size={14} />
                </button>
                <input
                  type="text"
                  className="w-full px-4 py-2 bg-white rounded-xl border border-slate-100 text-sm font-bold text-slate-700 shadow-sm"
                  value={item.name}
                  onChange={e => updateService(index, 'name', e.target.value)}
                  placeholder="Nombre del servicio (Ej. Santa Cena)"
                />
                <input
                  type="text"
                  className="w-full px-4 py-2 bg-white rounded-xl border border-slate-100 text-xs font-medium text-slate-500 shadow-sm"
                  value={item.description}
                  onChange={e => updateService(index, 'description', e.target.value)}
                  placeholder="Descripción breve"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Días Misioneros */}
        <section className="bg-white p-8 rounded-[2.5rem] border border-slate-50 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-display font-black text-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-500">
                <Globe size={18} />
              </div>
              Días Misioneros
            </h3>
            <button
              onClick={addMissionaryDay}
              className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-purple-50 hover:text-purple-500 transition-all border border-slate-100/50"
            >
              <Plus size={18} />
            </button>
          </div>
          <div className="space-y-4">
            {config.missionaryDays.map((item, index) => (
              <div key={index} className="flex flex-col gap-2 p-5 bg-slate-50/50 rounded-[1.5rem] relative border border-slate-100/50">
                <button
                  onClick={() => removeListItem('missionaryDays', index)}
                  className="absolute -top-2 -right-2 p-2 bg-white shadow-md border border-slate-100 text-slate-300 hover:text-red-500 rounded-xl transition-all"
                >
                  <Trash2 size={14} />
                </button>
                <input
                  type="text"
                  className="w-full px-4 py-2 bg-white rounded-xl border border-slate-100 text-sm font-bold text-slate-700 shadow-sm"
                  value={item.name}
                  onChange={e => updateMissionaryDay(index, 'name', e.target.value)}
                  placeholder="Nombre del día (Ej. Misión Regional)"
                />
                <input
                  type="text"
                  className="w-full px-4 py-2 bg-white rounded-xl border border-slate-100 text-xs font-medium text-slate-500 shadow-sm"
                  value={item.label}
                  onChange={e => updateMissionaryDay(index, 'label', e.target.value)}
                  placeholder="Frecuencia (Ej. Primer Domingo)"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Notificaciones de Cumpleaños */}
        <section className="bg-white p-8 rounded-[2.5rem] border border-slate-50 shadow-sm space-y-6">
          <h3 className="text-xl font-display font-black text-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
              <Calendar size={18} />
            </div>
            Alertas
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase font-black tracking-[0.15em] text-text-muted ml-1 mb-2">Días de Antelación</label>
              <input
                type="number"
                min="0"
                max="30"
                className="w-full px-5 py-4 bg-slate-50 rounded-[1.2rem] border-2 border-transparent focus:border-blue-500/20 shadow-sm transition-all font-bold text-slate-700"
                value={config.birthdayNoticeDays}
                onChange={e => setConfig({ ...config, birthdayNoticeDays: parseInt(e.target.value) || 0 })}
                placeholder="Ej. 3 días"
              />
              <p className="text-[10px] text-slate-400 mt-2 italic px-1">Se mostrarán alertas en el dashboard con esta antelación.</p>
            </div>
            <div className="flex items-center justify-between p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100/50">
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-700">Notificar por Email</p>
                <p className="text-[9px] text-text-muted uppercase font-black tracking-widest">Servicio Automático</p>
              </div>
              <button 
                onClick={() => setConfig({ ...config, enableBirthdayEmails: !config.enableBirthdayEmails })}
                className={`w-14 h-7 rounded-full transition-all relative ${config.enableBirthdayEmails ? 'bg-primary' : 'bg-slate-300'}`}
              >
                <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${config.enableBirthdayEmails ? 'left-8' : 'left-1'}`} />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
