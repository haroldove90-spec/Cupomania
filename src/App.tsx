/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toPng } from 'html-to-image';
import download from 'downloadjs';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  Ticket, 
  Sparkles, 
  Clock, 
  RefreshCw, 
  Copy, 
  Check, 
  ArrowRight,
  Store,
  Tag,
  Zap,
  Palette,
  Gift,
  Utensils,
  Star,
  ShoppingBag,
  Scissors,
  Upload,
  Download,
  X,
  CreditCard,
  User,
  LayoutGrid,
  Heart,
  Search,
  Settings,
  ShieldCheck,
  MessageCircle,
  Menu,
  Briefcase,
  Save,
  QrCode,
  Camera,
  Database,
  LayoutDashboard,
  Maximize2,
  Eye,
  EyeOff,
  Bell,
  Trash2,
  Archive,
  History,
  Send,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Navigation,
  Phone,
  Home,
  Globe
} from 'lucide-react';
import { generateCoupon } from './services/geminiService';
import { BusinessData, CuponConfig, UserRole, AppView, UserProfile, AdminMetrics, AppNotification, CouponRedemption } from './types';
import { getSupabase } from './lib/supabase';

// --- Helper Functions ---

const normalizeCategory = (cat: string | undefined): string => {
  if (!cat) return 'General';
  
  // Clean up: lowercase, trim, remove internal extra spaces
  let n = cat.trim().toLowerCase().replace(/\s+/g, ' ');
  
  // List of terms that should not be singularized
  const whitelist = ['tv cable', 'gas', 'tennis', 'compras', 'viveres'];
  if (whitelist.includes(n)) {
    return n.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }

  // Basic Pluralization logic for Spanish (80/20 rule)
  // Only apply if it's long enough to be a standard plural
  if (n.endsWith('s') && n.length > 5) {
    // If ends in 'es', it's likely plural of consonant (Hotel -> Hoteles)
    // but we need to be careful with words like 'clases' vs 'clase'
    if (n.endsWith('es') && n.length > 5) {
      // Check if it's like 'hoteles' or 'restaurantes'
      n = n.slice(0, -2);
      // If we removed 'es' and it ends in a consonant that doesn't usually end a word, 
      // or if it was 'restaurante', we might need to put 'e' back or just remove 's'
      if (!['a', 'e', 'i', 'o', 'u'].includes(n[n.length - 1])) {
        // keep as is (e.g. hotel)
      } else {
        // e.g. 'restaurante'
      }
    } else {
      n = n.slice(0, -1);
    }
  }
  
  // Return Title Case
  return n.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

// --- Admin & Auth Components ---

const AdminMetricsView = ({ metrics }: { metrics: AdminMetrics }) => {
  const cards = [
    { title: 'Ingresos Totales', value: `$${metrics.totalRevenue.toLocaleString()}`, icon: CreditCard, color: 'text-green-600', bg: 'bg-green-50' },
    { title: 'Usuarios Reg.', value: metrics.totalUsers, icon: User, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Patrocinadores', value: metrics.totalSponsors, icon: Briefcase, color: 'text-orange-600', bg: 'bg-orange-50' },
    { title: 'Cupones Creados', value: metrics.totalCoupons, icon: Ticket, color: 'text-purple-600', bg: 'bg-purple-50' },
    { title: 'Usuarios Activos', value: metrics.dailyActiveUsers, icon: Zap, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {cards.map((card, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className={`${card.bg} p-8 rounded-[32px] border border-black/5 shadow-sm`}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className={`p-3 rounded-2xl bg-white shadow-sm ${card.color}`}>
              <card.icon className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black uppercase text-black/40 tracking-widest">{card.title}</span>
          </div>
          <div className="text-4xl font-black tracking-tight">{card.value}</div>
        </motion.div>
      ))}
    </div>
  );
};

const AdminNotificationCenter = ({ showFeedback }: { showFeedback: (msg: string) => void }) => {
  const [notifForm, setNotifForm] = useState({ title: '', message: '', role: 'all' });
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
      if (!notifForm.title || !notifForm.message) {
          showFeedback('Por favor llena todos los campos', 'error');
          return;
      }
      setSending(true);
      try {
          const supabase = getSupabase();
          const { error } = await supabase.rpc('send_broadcast_notification', {
              p_title: notifForm.title,
              p_message: notifForm.message,
              p_type: 'promo',
              p_target_role: notifForm.role
          });
          if (error) throw error;
          showFeedback('¡Notificaciones enviadas con éxito!');
          setNotifForm({ title: '', message: '', role: 'all' });
      } catch (err) {
          console.error(err);
          showFeedback('Error al enviar notificaciones');
      } finally {
          setSending(false);
      }
  };

  return (
      <div className="p-4 md:p-14 max-w-4xl mx-auto pb-32">
      <header className="mb-12">
        <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase mb-3 leading-none">Centro de Avisos</h2>
        <div className="flex items-center gap-4">
          <div className="w-12 h-1.5 bg-primary" />
          <p className="text-black/40 font-bold uppercase text-[11px] tracking-widest">Comunicación masiva en tiempo real</p>
        </div>
      </header>

          <div className="bg-white rounded-[48px] p-8 md:p-14 shadow-[0_40px_100px_rgba(0,0,0,0.08)] border border-black/5">
              <div className="grid gap-10">
                  <div className="flex flex-col gap-4">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary ml-2">Título del Impacto</label>
                      <input 
                          value={notifForm.title}
                          onChange={e => setNotifForm({...notifForm, title: e.target.value})}
                          placeholder="Ej: ¡GRAN PROMOCIÓN HOY!" 
                          className="bg-gray-50 border-none rounded-3xl p-8 text-sm md:text-lg font-black uppercase placeholder:text-black/10 focus:ring-4 ring-primary/20 transition-all outline-none"
                      />
                  </div>

                  <div className="flex flex-col gap-4">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary ml-2">Mensaje del Aviso</label>
                      <textarea 
                          value={notifForm.message}
                          onChange={e => setNotifForm({...notifForm, message: e.target.value})}
                          placeholder="Escribe aquí el contenido de la notificación..." 
                          className="bg-gray-50 border-none rounded-[40px] p-8 text-sm md:text-lg font-bold h-48 focus:ring-4 ring-primary/20 transition-all outline-none resize-none"
                      />
                  </div>

                  <div className="flex flex-col gap-4">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary ml-2">Audiencia Objetivo</label>
                      <div className="grid grid-cols-3 gap-3">
                          {['all', 'usuario', 'patrocinador'].map(role => (
                              <button 
                                  key={role}
                                  onClick={() => setNotifForm({...notifForm, role})}
                                  className={`py-5 rounded-3xl text-[10px] font-black uppercase tracking-widest transition-all ${notifForm.role === role ? 'bg-secondary text-white shadow-xl scale-105' : 'bg-gray-100 text-black/30 hover:bg-gray-200'}`}
                              >
                                  {role === 'all' ? 'Todos' : role === 'usuario' ? 'Usuarios' : 'Sponsors'}
                              </button>
                          ))}
                      </div>
                  </div>

                  <button 
                      onClick={handleSend}
                      disabled={sending}
                      className="w-full bg-primary text-white py-8 rounded-[40px] text-[12px] font-black uppercase tracking-[0.3em] shadow-[0_20px_60px_rgba(var(--primary-rgb),0.3)] hover:bg-black transition-all active:scale-95 disabled:opacity-50 mt-6 flex items-center justify-center gap-4"
                  >
                      {sending ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                      Disparar Notificación Masiva
                  </button>
                  
                  <div className="mt-4 p-6 bg-orange-50 rounded-3xl border border-orange-100">
                    <p className="text-[9px] font-bold text-orange-800 uppercase leading-relaxed text-center tracking-widest">
                      ATENCIÓN: Esta acción enviará una notificación push y un aviso en la app a todos los usuarios seleccionados de forma inmediata.
                    </p>
                  </div>
              </div>
          </div>
      </div>
  );
};

const CouponCounterView = ({ currentUser, showFeedback }: { currentUser: UserProfile; coupons: CuponConfig[]; showFeedback: (msg: string, type?: 'success' | 'error') => void }) => {
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [selectedFullPhoto, setSelectedFullPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCapturedPhoto(null);
    setRegistrations([]);
    fetchRegistrations();
  }, [currentUser.id]);

  const fetchRegistrations = async () => {
    try {
      const supabase = getSupabase();
      let query = supabase
        .from('photo_registrations')
        .select('*');
      
      // Isolate by user/role: Admin sees all, Sponsor sees only their own
      if (currentUser?.role === 'patrocinador') {
        query = query.eq('user_id', currentUser.id);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (!error && data) {
        setRegistrations(data);
      } else {
        // Fallback or empty
        const { data: redData } = await supabase
          .from('coupon_redemptions')
          .select('*')
          .order('redeemed_at', { ascending: false });
        if (redData) {
          setRegistrations(redData.map((r: any) => ({
            id: r.id,
            created_at: r.redeemed_at,
            photo_url: null,
            description: 'Canje Anterior'
          })));
        }
      }
    } catch (err) {
      console.error('Error fetching registrations:', err);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showFeedback('La imagen es demasiado grande (máx 10MB)', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Max resolution 1200px
        const MAX_SIZE = 1200;
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const compressed = canvas.toDataURL('image/jpeg', 0.7);
        setCapturedPhoto(compressed);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const saveRegistration = async () => {
    if (!capturedPhoto) return;
    setIsUploading(true);
    
    try {
      const supabase = getSupabase();
      // Intentar inserción completa
      const payload = {
        user_id: currentUser.id,
        user_name: currentUser.name || currentUser.email,
        photo_url: capturedPhoto,
        created_at: new Date().toISOString(),
        description: 'Registro de foto'
      };

      const { error } = await supabase.from('photo_registrations').insert(payload);

      if (error) {
        console.warn('Primer intento fallido:', error.message);
        
        // Caso A: Falta la columna user_name o violacion de FK
        // Intentamos una inserción mínima sin user_id (para saltar el FK) y sin user_name
        const minimalPayload: any = {
          photo_url: capturedPhoto,
          created_at: new Date().toISOString(),
          description: `Registro por ${currentUser.name || 'Usuario'} (Fallback)`
        };

        const { error: retryError } = await supabase.from('photo_registrations').insert(minimalPayload);
        
        if (retryError) {
          throw new Error(`Error persistente: ${retryError.message}`);
        }
        
        showFeedback('Foto guardada (modo compatibilidad)', 'success');
      } else {
        showFeedback('¡Foto registrada con éxito!', 'success');
      }

      setCapturedPhoto(null);
      fetchRegistrations();
    } catch (err: any) {
      console.error('Error saving registration:', err);
      const msg = err.message || 'Error desconocido';
      showFeedback(`ERROR: ${msg}. Por favor, ejecuta el SQL en Supabase para limpiar restricciones.`, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const deleteRegistration = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('¿ELIMINAR ESTE REGISTRO DEFINITIVAMENTE?')) return;
    
    try {
      const supabase = getSupabase();
      const { error, count } = await supabase
        .from('photo_registrations')
        .delete({ count: 'exact' })
        .eq('id', id);

      if (error) {
        console.error('Database error during deletion:', error);
        throw error;
      }
      
      console.log('Delete attempt result - Count:', count, 'ID:', id);
      
      if (count === 0 || count === null) {
        // Fallback: Try without count: exact to see if it makes a difference in some environments
        const { error: retryError } = await supabase
          .from('photo_registrations')
          .delete()
          .eq('id', id);
          
        if (retryError) throw retryError;
        
        // If still no indication, we assume it might have worked or failed silently
        showFeedback('Aviso: El servidor no confirmó el borrado, re-sincronizando...', 'error');
        fetchRegistrations();
        return;
      }
      
      setRegistrations(prev => prev.filter(r => r.id !== id));
      showFeedback('Registro eliminado con éxito', 'success');
    } catch (err: any) {
      console.error('Error deleting registration:', err);
      showFeedback(`Error al eliminar: ${err.message || 'vuelve a intentar'}`, 'error');
    }
  };

  return (
    <div className="w-full h-full p-6 md:p-16 max-w-[1400px] mx-auto pb-32">
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-black/5 pb-8">
        <div>
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase mb-3 leading-none">REGISTRO DE CUPONES</h2>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-1.5 bg-primary" />
              <p className="text-black/40 font-bold uppercase text-[11px] tracking-widest">Evidencia de canje por fotografía</p>
            </div>
            <div className="px-6 py-2 bg-black text-white rounded-2xl">
              <span className="text-[10px] font-black uppercase tracking-widest">{registrations.length} TOTALES</span>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileSelect}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="group flex items-center gap-4 px-10 py-6 rounded-[28px] text-[12px] font-black uppercase tracking-widest bg-primary text-white shadow-2xl shadow-primary/30 transition-all hover:scale-105 active:scale-95"
          >
            <Camera className="w-6 h-6 group-hover:rotate-12 transition-transform" />
            <span>Registrar Cupón</span>
          </button>
        </div>
      </header>

      {capturedPhoto && (
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16 p-8 md:p-12 bg-white rounded-[48px] shadow-2xl border border-black/5"
        >
          <div className="relative aspect-video rounded-[36px] overflow-hidden bg-black mb-10 border-8 border-primary/10">
            <img src={capturedPhoto} className="w-full h-full object-cover" alt="Preview" />
          </div>
          <div className="flex flex-col sm:flex-row gap-6 max-w-2xl mx-auto">
            <button 
              onClick={() => setCapturedPhoto(null)}
              className="flex-1 px-10 py-6 bg-black/5 text-black font-black uppercase text-[11px] tracking-widest rounded-3xl transition-all hover:bg-black/10"
              disabled={isUploading}
            >
              Descartar
            </button>
            <button 
              onClick={saveRegistration}
              className="flex-[2] px-10 py-6 bg-primary text-white font-black uppercase text-[11px] tracking-widest rounded-3xl shadow-2xl shadow-primary/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              disabled={isUploading}
            >
              {isUploading ? 'Procesando...' : 'Guardar Evidencia'}
            </button>
          </div>
        </motion.div>
      )}

      {isInitializing ? (
        <div className="py-24 text-center">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10">
          {registrations.length === 0 ? (
            <div className="col-span-full py-32 text-center bg-gray-50 rounded-[48px] border-4 border-dashed border-black/5">
              <Camera className="w-16 h-16 text-black/10 mx-auto mb-6" />
              <p className="text-black/30 font-black uppercase text-[11px] tracking-[0.25em]">Sin registros que mostrar</p>
            </div>
          ) : (
            registrations.map((reg) => (
              <motion.div 
                key={reg.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-[44px] p-5 shadow-lg border border-black/5 group hover:shadow-2xl transition-all cursor-pointer relative"
                onClick={() => setSelectedFullPhoto(reg.photo_url || '')}
              >
                <div className="aspect-square rounded-[36px] overflow-hidden bg-black/5 mb-6 relative">
                   {reg.photo_url ? (
                     <img src={reg.photo_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="Registro" />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center bg-black/5">
                       <Clock className="w-10 h-10 text-black/10" />
                     </div>
                   )}
                   <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                     <Maximize2 className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity translate-y-4 group-hover:translate-y-0 duration-300" />
                   </div>
                   <div className="absolute bottom-3 left-3 right-3 text-center">
                      <div className="inline-flex px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-lg text-[8px] text-white font-black uppercase tracking-widest gap-3 shadow-lg">
                         <span>{new Date(reg.created_at).toLocaleDateString()}</span>
                         <span className="opacity-50">|</span>
                         <span>{new Date(reg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                   </div>
                </div>
                <div className="flex items-center justify-between px-2 pb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black uppercase text-black/40 tracking-wider mb-1 truncate">
                      {reg.user_name || reg.description || 'Registro'}
                    </p>
                    <p className="font-mono text-[7px] font-bold text-black/20 truncate">{reg.id}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <button 
                      onClick={(e) => deleteRegistration(reg.id, e)}
                      className="w-8 h-8 bg-red-50 text-red-500 rounded-[12px] flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm"
                      title="Eliminar registro"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="w-8 h-8 bg-green-50 text-green-500 rounded-[12px] flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Photo Lightbox */}
      <AnimatePresence>
        {selectedFullPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedFullPhoto(null)}
            className="fixed inset-0 z-[3000] bg-black flex items-center justify-center p-4 sm:p-12"
          >
            <button 
              onClick={(e) => { e.stopPropagation(); setSelectedFullPhoto(null); }}
              className="absolute top-6 right-6 w-14 h-14 bg-red-600 hover:bg-red-700 shadow-2xl rounded-2xl flex items-center justify-center text-white transition-all z-[3100] active:scale-90"
              title="Cerrar"
            >
              <X className="w-8 h-8" />
            </button>
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={selectedFullPhoto}
              className="w-full h-auto max-h-full object-contain rounded-xl shadow-2xl"
              alt="Ampliada"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


const AdminFlyerView = ({ initialLinks, onUpdate }: { initialLinks: { flyer1: string; flyer2: string }; onUpdate: (links: { flyer1: string; flyer2: string }) => void }) => {
  const [links, setLinks] = useState(initialLinks);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(links);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-12 max-w-[1400px] mx-auto py-16 px-6 md:px-12">
      <header className="mb-12 border-b border-black/5 pb-8">
        <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase mb-3 leading-none">Flyers Publi</h2>
        <div className="flex items-center gap-4">
          <div className="w-12 h-1.5 bg-primary" />
          <p className="text-black/40 font-bold uppercase text-[11px] tracking-widest">Gestión de publicidad y banners</p>
        </div>
      </header>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
          <div className="bg-white rounded-[48px] p-8 md:p-14 border border-black/5 shadow-2xl shadow-black/5 flex flex-col">
            <div className="flex items-center gap-4 mb-10">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                 <Palette className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight">Banner Principal</h3>
            </div>
            
            <div className="space-y-8 flex-1">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-black/40 ml-4">Enlace de Imagen (URL)</label>
                <input 
                  type="text" 
                  value={links.flyer1} 
                  onChange={e => setLinks({ ...links, flyer1: e.target.value })}
                  placeholder="https://ejemplo.com/flyer1.png"
                  className="w-full bg-gray-50 border-none rounded-2xl p-5 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-inner"
                />
              </div>
              
              <div className="aspect-video rounded-[36px] overflow-hidden bg-black/5 border border-black/5">
                {links.flyer1 ? (
                  <img src={links.flyer1} className="w-full h-full object-contain" alt="Preview 1" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center opacity-20">
                    <Camera className="w-12 h-12 mb-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Vista Previa</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[48px] p-8 md:p-14 border border-black/5 shadow-2xl shadow-black/5 flex flex-col">
            <div className="flex items-center gap-4 mb-10">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                 <Palette className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight">Banner Detalle</h3>
            </div>
            
            <div className="space-y-8 flex-1">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-black/40 ml-4">Enlace de Imagen (URL)</label>
                <input 
                  type="text" 
                  value={links.flyer2} 
                  onChange={e => setLinks({ ...links, flyer2: e.target.value })}
                  placeholder="https://ejemplo.com/flyer2.png"
                  className="w-full bg-gray-50 border-none rounded-2xl p-5 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-inner"
                />
              </div>
              
              <div className="aspect-video rounded-[36px] overflow-hidden bg-black/5 border border-black/5">
                {links.flyer2 ? (
                  <img src={links.flyer2} className="w-full h-full object-contain" alt="Preview 2" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center opacity-20">
                    <Camera className="w-12 h-12 mb-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Vista Previa</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-8">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="px-16 py-6 bg-black text-white rounded-full text-[12px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-black/40 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {isSaving ? 'Guardando...' : 'Actualizar Flyers'}
          </button>
        </div>

      <div className="bg-orange-50 rounded-[32px] p-8 border border-orange-100 flex items-start gap-4">
        <AlertCircle className="w-6 h-6 text-orange-500 shrink-0 mt-1" />
        <div>
          <h4 className="text-[10px] font-black uppercase text-orange-600 tracking-widest mb-1">Nota Importante</h4>
          <p className="text-xs font-bold text-orange-800 leading-relaxed uppercase opacity-60">Estos cambios son instantáneos para todos los usuarios conectados. Asegúrate de que los links sean públicos y accesibles.</p>
        </div>
      </div>
    </div>
  );
};

const AdminUsersList = ({ users, onToggleStatus, onManageFlyer, onDeleteUser }: { 
  users: UserProfile[]; 
  onToggleStatus: (id: string) => void; 
  onManageFlyer: () => void;
  onDeleteUser: (id: string) => void;
}) => {
  const [activeTab, setActiveTab] = useState<'patrocinadores' | 'usuarios' | 'admins'>('patrocinadores');

  const filteredUsers = users.filter(u => {
    if (activeTab === 'patrocinadores') return u.role === 'patrocinador';
    if (activeTab === 'usuarios') return u.role === 'usuario';
    return u.role === 'admin';
  });

  return (
    <div className="space-y-6">
      <div className="flex gap-2 p-1 bg-gray-100 rounded-[24px] max-w-fit mb-4">
        <button 
          onClick={() => setActiveTab('patrocinadores')}
          className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'patrocinadores' ? 'bg-white text-secondary shadow-sm' : 'text-black/30 hover:text-black hover:bg-white/50'}`}
        >
          Patrocinadores
        </button>
        <button 
          onClick={() => setActiveTab('usuarios')}
          className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'usuarios' ? 'bg-white text-secondary shadow-sm' : 'text-black/30 hover:text-black hover:bg-white/50'}`}
        >
          Usuarios / Prospectos
        </button>
        <button 
          onClick={() => setActiveTab('admins')}
          className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'admins' ? 'bg-white text-secondary shadow-sm' : 'text-black/30 hover:text-black hover:bg-white/50'}`}
        >
          Admins
        </button>
      </div>

      <div className="bg-white rounded-[32px] border border-black/5 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-black/5 bg-gray-50/50">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black uppercase tracking-tight">Gestión de Cuentas</h3>
            <div className="flex gap-4">
              <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[9px] font-black uppercase tracking-widest">{filteredUsers.length} MOSTRADOS</span>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-black/5">
                <th className="px-8 py-4 text-[10px] font-black uppercase text-black/40 tracking-widest">Usuario</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-black/40 tracking-widest">Rol</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-black/40 tracking-widest">WhatsApp</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-black/40 tracking-widest">Sitio Web</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-black/40 tracking-widest">Servicios</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-black/40 tracking-widest">Estado</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-black/40 tracking-widest">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-white text-xs font-black shrink-0">
                        {user.photo ? <img src={user.photo} className="w-full h-full rounded-full object-cover" /> : user.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-black text-sm uppercase leading-none mb-1">{user.name}</div>
                        <div className="text-[10px] text-black/40 font-bold">@{user.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                      user.role === 'admin' ? 'bg-red-50 text-red-600' : 
                      user.role === 'patrocinador' ? 'bg-orange-50 text-orange-600' : 
                      'bg-blue-50 text-blue-600'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-xs font-bold text-black/60">{user.whatsapp}</td>
                  <td className="px-8 py-6 text-xs font-bold text-black/60">
                    {user.website ? (
                      <a href={user.website.startsWith('http') ? user.website : `https://${user.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                        Ver Link
                      </a>
                    ) : '-'}
                  </td>
                  <td className="px-8 py-6 text-[9px] font-bold text-black/40 uppercase">
                    {user.services && user.services.length > 0 ? (
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {user.services.slice(0, 3).map((s, i) => (
                          <span key={i} className="bg-gray-100 px-2 py-0.5 rounded text-[8px]">{s}</span>
                        ))}
                        {user.services.length > 3 && <span>+{user.services.length - 3}</span>}
                      </div>
                    ) : '-'}
                  </td>
                  <td className="px-8 py-6">
                    <span className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-widest ${user.isActive ? 'text-green-600' : 'text-red-500'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-green-600' : 'bg-red-500'}`} />
                      {user.isActive ? 'Activo' : 'Suspendido'}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => onToggleStatus(user.id)}
                        disabled={user.role === 'admin'}
                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${user.role === 'admin' ? 'opacity-20 cursor-not-allowed' : user.isActive ? 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white' : 'bg-green-50 text-green-600 hover:bg-green-600 hover:text-white'}`}
                      >
                        {user.isActive ? 'Desactivar' : 'Reactivar'}
                      </button>
                      {user.role !== 'admin' && (
                        <button 
                          onClick={() => {
                            if (window.confirm(`¿Estás seguro de eliminar PERMANENTEMENTE a ${user.name}? Esta acción no se puede deshacer.`)) {
                              onDeleteUser(user.id);
                            }
                          }}
                          className="p-2 border border-red-100 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                          title="Eliminar permanentemente"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div className="p-20 text-center">
              <User className="w-12 h-12 text-black/5 mx-auto mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest text-black/20">No hay registros en esta categoría</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AuthView = ({ onAuth, users, upsertProfile, onBack }: { onAuth: (user: UserProfile) => void; users: UserProfile[]; upsertProfile: (user: UserProfile) => Promise<UserProfile | null>; onBack?: () => void }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [role, setRole] = useState<UserRole>('usuario');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    whatsapp: '',
    website: '',
    businessName: '',
    representativeName: '',
    address: '',
    locationLink: '',
    services: [] as string[],
    photo: null as string | null
  });

  const [newService, setNewService] = useState('');

  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (isRegister) {
      if (formData.password !== formData.confirmPassword) {
        setError('Las contraseñas no coinciden');
        setLoading(false);
        return;
      }
      if (users.find(u => u.username === formData.username)) {
        setError('El nombre de usuario ya existe');
        setLoading(false);
        return;
      }
      const newUser: UserProfile = {
        id: crypto.randomUUID(), 
        role,
        name: formData.name, // Representative name
        username: formData.username,
        email: formData.email,
        whatsapp: formData.whatsapp,
        website: formData.website,
        businessName: role === 'patrocinador' ? formData.businessName : undefined,
        representativeName: role === 'patrocinador' ? formData.name : undefined, // Sync name to representativeName too
        address: role === 'patrocinador' ? formData.address : undefined,
        locationLink: role === 'patrocinador' ? formData.locationLink : undefined,
        services: role === 'patrocinador' ? formData.services : [],
        photo: formData.photo,
        isActive: true,
        createdAt: new Date().toISOString()
      };
      
      upsertProfile(newUser).then((savedProfile) => {
        if (!savedProfile) {
          setError('Error al registrar. Verifica tu conexión.');
          setLoading(false);
          return;
        }
        onAuth(savedProfile);
      }).catch(err => {
        setLoading(false);
        console.error('Registration error details:', err);
        const errorMsg = typeof err === 'object' && err.message ? err.message : String(err);
        
        if (errorMsg.includes('column') || errorMsg.includes('profiles')) {
          setError('ERROR EN BASE DE DATOS: Faltan columnas en la tabla "profiles". Favor de ejecutar el script SQL actualizado.');
        } else if (errorMsg.includes('profiles_username_key')) {
          setError('Este nombre de usuario ya está en uso.');
        } else if (errorMsg.includes('profiles_email_key')) {
          setError('Este correo electrónico ya está registrado.');
        } else {
          setError('Error: ' + errorMsg);
        }
      });
    } else {
      // Login simulation
      if (formData.username === 'appdesign' && (formData.password === 'Chevropar#1970' || formData.password === '')) {
        const admin = users.find(u => u.username === 'appdesign');
        if (admin) onAuth(admin);
        else setError('Cargando datos de administrador...');
        setLoading(false);
        return;
      }

      const found = users.find(u => u.username === formData.username && u.isActive);
      if (found) {
        onAuth(found);
      } else {
        setError('Credenciales inválidas o cuenta desactivada. Asegúrate de estar registrado.');
      }
      setLoading(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData(p => ({ ...p, photo: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-[40px] p-8 sm:p-12 shadow-2xl border border-black/5"
      >
        <div className="text-center mb-10">
          <img src="https://cossma.com.mx/cuponmania.png" className="h-16 mx-auto mb-6" alt="Cuponmania" />
          <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">{isRegister ? 'Registro' : 'Ingresar'}</h2>
          <p className="text-xs text-black/40 font-bold uppercase tracking-widest">{isRegister ? 'Únete a la red de beneficios' : 'Bienvenido de nuevo'}</p>
        </div>

        {isRegister && (
          <div className="flex gap-2 p-1 bg-gray-50 rounded-2xl mb-8">
            <button onClick={() => setRole('usuario')} className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${role === 'usuario' ? 'bg-primary text-white shadow-md' : 'text-black/40'}`}>Soy Usuario</button>
            <button onClick={() => setRole('patrocinador')} className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${role === 'patrocinador' ? 'bg-secondary text-white shadow-md' : 'text-black/40'}`}>Soy Patrocinador</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-black/40 ml-4 tracking-widest">Nombre de Usuario</label>
            <input 
              required
              type="text" 
              className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none"
              value={formData.username}
              onChange={e => setFormData(p => ({ ...p, username: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-black/40 ml-4 tracking-widest">Contraseña</label>
            <div className="relative">
              <input 
                required
                type={showPassword ? "text" : "password"} 
                className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none pr-12"
                value={formData.password}
                onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-black/20 hover:text-primary transition-all"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {isRegister && (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-black/40 ml-4 tracking-widest">Confirmar Contraseña</label>
              <div className="relative">
                <input 
                  required
                  type={showPassword ? "text" : "password"} 
                  className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none pr-12"
                  value={formData.confirmPassword}
                  onChange={e => setFormData(p => ({ ...p, confirmPassword: e.target.value }))}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-black/20 hover:text-primary transition-all"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {isRegister && (
            <>
              {role === 'patrocinador' && (
                <div className="space-y-4 border-y border-black/5 py-6 my-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-black/40 ml-4 tracking-widest">Logo del Negocio</label>
                    <label className="w-full flex items-center justify-center p-4 bg-gray-50 rounded-2xl cursor-pointer border-2 border-dashed border-black/5 hover:border-primary/20 transition-all">
                      {formData.photo ? <img src={formData.photo} className="h-10 object-contain" /> : <div className="flex items-center gap-2 text-black/20"><Camera className="w-4 h-4"/> <span className="text-[10px] font-black uppercase">Subir Logo</span></div>}
                      <input type="file" className="hidden" accept="image/*" onChange={handlePhotoChange} />
                    </label>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-black/40 ml-4 tracking-widest">Nombre Completo del Representante</label>
                    <input required type="text" className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-black/40 ml-4 tracking-widest">Nombre del Negocio</label>
                    <input required type="text" className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none" value={formData.businessName} onChange={e => setFormData(p => ({ ...p, businessName: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-black/40 ml-4 tracking-widest">Dirección Comercial</label>
                    <input required type="text" className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none" value={formData.address} onChange={e => setFormData(p => ({ ...p, address: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-black/40 ml-4 tracking-widest">Link Google Maps (Ubicación)</label>
                    <input required type="url" placeholder="https://maps.app.goo.gl/..." className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none" value={formData.locationLink} onChange={e => setFormData(p => ({ ...p, locationLink: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-black/40 ml-4 tracking-widest">Página Web (Opcional)</label>
                    <div className="relative">
                      <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                      <input 
                        type="url" 
                        placeholder="https://www.tunegocio.com" 
                        className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-4 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none" 
                        value={formData.website} 
                        onChange={e => setFormData(p => ({ ...p, website: e.target.value }))} 
                      />
                    </div>
                  </div>
                  <div className="space-y-2 border-t border-black/5 pt-4">
                    <label className="text-[10px] font-black uppercase text-black/40 ml-4 tracking-widest">Servicios y/o Productos</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Ej: Lavado Express"
                        className="flex-1 bg-gray-50 border-none rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none" 
                        value={newService} 
                        onChange={e => setNewService(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && newService.trim()) {
                            e.preventDefault();
                            setFormData(p => ({ ...p, services: [...p.services, newService.trim()] }));
                            setNewService('');
                          }
                        }}
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          if (newService.trim()) {
                            setFormData(p => ({ ...p, services: [...p.services, newService.trim()] }));
                            setNewService('');
                          }
                        }}
                        className="bg-primary text-white p-4 rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all"
                      >
                        <Tag className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.services.map((s, i) => (
                        <span key={i} className="bg-secondary/10 text-secondary px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                          {s}
                          <button 
                            type="button" 
                            onClick={() => setFormData(p => ({ ...p, services: p.services.filter((_, idx) => idx !== i) }))}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {role === 'usuario' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-black/40 ml-4 tracking-widest">Nombre Completo</label>
                  <input required type="text" className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
                </div>
              )}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-black/40 ml-4 tracking-widest">Teléfono (WhatsApp)</label>
                <input required type="text" className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none" value={formData.whatsapp} onChange={e => setFormData(p => ({ ...p, whatsapp: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-black/40 ml-4 tracking-widest">Email</label>
                <input required type="email" className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} />
              </div>
            </>
          )}

          {error && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest text-center mt-4">{error}</p>}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-black text-white py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-primary transition-all mt-6 active:scale-95 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>PROCESANDO...</span>
              </div>
            ) : (
              isRegister ? 'Crear Cuenta' : 'Ingresar'
            )}
          </button>
        </form>

        <button onClick={() => setIsRegister(!isRegister)} className="w-full mt-6 text-[10px] font-black uppercase tracking-widest text-black/40 hover:text-primary transition-all">
          {isRegister ? '¿Ya tienes cuenta? Ingresa' : '¿No tienes cuenta? Registrate'}
        </button>

        {onBack && (
          <button 
            type="button"
            onClick={onBack}
            className="w-full mt-4 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-black/20 hover:text-black transition-all pt-4 border-t border-black/5"
          >
            <Home className="w-4 h-4" /> Regresar a Cuponmanía
          </button>
        )}
      </motion.div>
    </div>
  );
};

// --- Custom Components ---
const CouponTicket = ({ config, logo, scale = 1, origin = 'origin-top-left' }: { 
  config: CuponConfig; 
  logo?: string | null; 
  scale?: number; 
  origin?: string;
}) => {
  const bgColor = config.data.diseno.color_primario || '#1a2a3a'; // Prefer a dark color if not provided

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '---';
    try {
      const date = new Date(dateStr);
      // Format as 05 - MAY - 26
      const day = date.getDate().toString().padStart(2, '0');
      const month = date.toLocaleString('es-MX', { month: 'short' }).toUpperCase().replace('.', '');
      const year = date.getFullYear().toString().slice(-2);
      return `${day} - ${month} - ${year}`;
    } catch { return dateStr; }
  };

  return (
    <div 
      className={`relative ${origin} transition-all duration-500 ease-out rounded-[32px] shadow-2xl overflow-hidden`}
      id="coupon-ticket-container"
      style={{ 
        transform: `scale(${scale})`,
        width: '1000px',
        height: '550px',
        backgroundColor: bgColor,
        flexShrink: 0
      }}
    >
      {/* Subtle Pattern overlay for premium feel - CSS only to avoid CORS */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,1) 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
      <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-white/5"></div>
      
      {/* Decorative Notches - more subtle like a real ticket */}
      <div className="absolute top-1/2 -left-6 w-12 h-12 bg-[#fafafa] rounded-full -translate-y-1/2 shadow-inner z-20"></div>
      <div className="absolute top-1/2 -right-6 w-12 h-12 bg-[#fafafa] rounded-full -translate-y-1/2 shadow-inner z-20"></div>

      <div className="relative h-full w-full p-12 flex flex-col z-10 font-sans">
        
        {/* Top Section */}
        <div className="flex flex-1 flex-col sm:flex-row items-center gap-10">
          {/* Section: Logo (Protagonista) */}
          <div className="flex-1 flex items-center justify-center min-h-[220px]">
             <img 
               src={logo || config?.data?.header?.logo_url || "https://cossma.com.mx/cuponmania.png"} 
               alt="Sponsor Logo" 
               className="w-full max-w-[450px] h-auto max-h-[300px] object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.3)] transition-transform hover:scale-105 duration-700" 
               referrerPolicy="no-referrer" 
               crossOrigin="anonymous"
             />
          </div>

          {/* Right: Big Impact Offer (Secondary to Logo in layout hierarchy per request) */}
          <div className="flex-1 flex flex-col items-center sm:items-end justify-center text-center sm:text-right gap-6">
            <h2 className="text-[72px] font-black leading-[0.8] tracking-tighter uppercase drop-shadow-[0_15px_30px_rgba(0,0,0,0.4)] text-white">
              {config?.data?.oferta?.texto || 'OFERTA ESPECIAL'}
            </h2>
            <div className="mt-2 text-white">
              <Timer targetDate={config?.data?.cronometro?.timestamp_final || new Date(Date.now() + 86400000).toISOString()} />
            </div>
          </div>
        </div>

        {/* Bottom Section: Terms and Validity */}
        <div className="mt-auto pt-4 border-t border-white/10 flex items-end justify-between">
          <div className="max-w-[75%] overflow-hidden">
            <span className="text-[13px] font-black text-white/60 uppercase tracking-widest block mb-2">Condiciones:</span>
            <div className="text-[20px] font-bold text-white leading-tight">
               {(config?.data?.condiciones || 'Solo aplica en tienda física\nNo válido con otras promociones').split('\n').map((line, i) => (
                 <p key={i} className="flex gap-3 items-start mb-1 truncate">
                    <span className="text-primary mt-1.5 text-lg">✦</span> {line.replace(/^\*?\s*/, '')}
                 </p>
               ))}
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-2 shrink-0 ml-4">
            <div className="text-right">
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Vigencia:</span>
              <span className="text-[14px] font-black text-white/80 uppercase">
                {formatDate(config?.data?.cronometro?.fecha_inicio || new Date().toISOString())}
                <span className="mx-2 opacity-30">|</span>
                {formatDate(config?.data?.cronometro?.fecha_fin || new Date(Date.now() + 86400000).toISOString())}
              </span>
            </div>
            
            {/* Super discrete watermark */}
            <div className="flex items-center gap-2 opacity-30 grayscale hover:grayscale-0 transition-all">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white">Auténtico</span>
              <img src="https://cossma.com.mx/cuponmania.png" alt="Seal" className="h-4 object-contain" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


const Timer = ({ targetDate }: { targetDate: string }) => {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(targetDate) - +new Date();
      if (difference > 0) {
        return {
          h: Math.floor((difference / (1000 * 60 * 60)) % 24),
          m: Math.floor((difference / 1000 / 60) % 60),
          s: Math.floor((difference / 1000) % 60)
        };
      }
      return { h: 0, m: 0, s: 0 };
    };

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    
    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className="bg-black/80 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 inline-flex items-center gap-4 shadow-xl">
      <Clock className="w-8 h-8 text-orange-500" />
      <span className="text-4xl font-black text-white tracking-widest tabular-nums">
        {timeLeft.h.toString().padStart(2, '0')}:{timeLeft.m.toString().padStart(2, '0')}:{timeLeft.s.toString().padStart(2, '0')}
      </span>
    </div>
  );
};

const IconRenderer = ({ iconName }: { iconName: string }) => {
  const normalized = iconName.toLowerCase();
  if (normalized.includes('gift') || normalized.includes('regalo')) return <Gift className="w-8 h-8" />;
  if (normalized.includes('fork') || normalized.includes('tenedor') || normalized.includes('utensils')) return <Utensils className="w-8 h-8" />;
  if (normalized.includes('star') || normalized.includes('estrella')) return <Star className="w-8 h-8" />;
  if (normalized.includes('bag') || normalized.includes('bolsa') || normalized.includes('shopping')) return <ShoppingBag className="w-8 h-8" />;
  if (normalized.includes('scissors') || normalized.includes('tijeras')) return <Scissors className="w-8 h-8" />;
  return <Ticket className="w-8 h-8" />;
};

const CouponPreview = ({ config, logo, onReset, onPublish, onSaveDraft, showFeedback, sponsor }: { 
  config: CuponConfig; 
  logo: string | null; 
  onReset: () => void; 
  onPublish: (img?: string) => void; 
  onSaveDraft: (img?: string) => void;
  showFeedback: (msg: string, type?: 'success' | 'error') => void;
  sponsor?: UserProfile | null;
  key?: React.Key;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const couponRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const bgColor = config.data.diseno.color_primario || '#1a2a3a';
  
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const baseWidth = 1000;
        const availableWidth = Math.max(300, containerWidth - 40);
        const newScale = Math.min(1, availableWidth / baseWidth);
        setScale(newScale);
      }
    };

    handleResize();
    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, []);

  const captureImage = async () => {
    if (!couponRef.current) return null;
    try {
      showFeedback('Capturando imagen...');
      
      // Intentar forzar la carga de imágenes antes de capturar
      const images = couponRef.current.getElementsByTagName('img');
      for (let i = 0; i < images.length; i++) {
        if (!images[i].complete) {
          await new Promise(resolve => {
            images[i].onload = resolve;
            images[i].onerror = resolve;
          });
        }
      }

      return await toPng(couponRef.current, {
        quality: 0.9,
        pixelRatio: 2,
        cacheBust: true,
        width: 1000,
        height: 550,
        backgroundColor: bgColor, // Use the primary color as fallback background
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
          margin: '0',
          padding: '0',
          borderRadius: '32px'
        }
      });
    } catch (err: any) {
      console.error('Error capturing image:', err);
      showFeedback(`Error de captura: ${err.message || 'Error técnico'}`, 'error');
      return null;
    }
  };

  const handlePublishClick = async () => {
    setIsExporting(true);
    showFeedback('Preparando imagen del cupón...');
    const imgData = await captureImage();
    onPublish(imgData || undefined);
    setIsExporting(false);
  };

  const handleSaveDraftClick = async () => {
    setIsExporting(true);
    showFeedback('Generando borrador con imagen...');
    const imgData = await captureImage();
    onSaveDraft(imgData || undefined);
    setIsExporting(false);
  };

  const exportImage = async () => {
    if (couponRef.current) {
      setIsExporting(true);
      showFeedback('Preparando descarga...');
      try {
        // Aseguramos que el elemento esté en escala 1 para la captura
        const dataUrl = await toPng(couponRef.current, {
          quality: 0.95,
          pixelRatio: 2,
          cacheBust: true,
          style: { 
            transform: 'scale(1)', 
            transformOrigin: 'top left',
            margin: '0',
            padding: '0',
            opacity: '1',
            visibility: 'visible',
            display: 'flex'
          },
          width: 1000,
          height: 550,
          backgroundColor: bgColor
        });
        const fileName = `cupon-cuponmania-${config.data.header.nombre_negocio.toLowerCase().replace(/\s+/g, '-')}.png`;
        download(dataUrl, fileName);
        showFeedback('¡Cupón exportado con éxito!');
      } catch (err: any) { 
        console.error('Error al exportar:', err); 
        showFeedback(`Error al exportar: ${err.message || 'Error técnico'}`, 'error');
      } finally {
        setIsExporting(false);
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full flex flex-col items-center py-6"
      ref={containerRef}
    >
      <div 
        style={{ 
          width: '100%', 
          height: `${550 * scale}px`,
          display: 'flex',
          justifyContent: 'center',
          overflow: 'visible'
        }}
      >
        <div ref={couponRef} className="flex justify-center" style={{ width: `${1000 * scale}px`, height: `${550 * scale}px` }}>
          <CouponTicket config={config} logo={logo} scale={scale} origin="origin-top" />
        </div>
      </div>
      
      <div className="flex flex-wrap items-center justify-center gap-3 mt-10 mb-6 px-4">
        <button 
          disabled={isExporting}
          onClick={handleSaveDraftClick} 
          className="bg-white border border-black/10 text-black px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-gray-50 transition-all shadow-sm active:scale-95 group disabled:opacity-50"
        >
          {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />} Guardar
        </button>
        <button 
          disabled={isExporting}
          onClick={handlePublishClick} 
          className="bg-secondary text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all shadow-md shadow-secondary/10 active:scale-95 disabled:opacity-50"
        >
          {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 fill-current" />} Publicar
        </button>
        <button 
          disabled={isExporting}
          onClick={exportImage} 
          className="bg-primary text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all shadow-md shadow-primary/10 active:scale-95 disabled:opacity-50"
        >
          <Download className="w-4 h-4" /> Exportar
        </button>
        <button onClick={onReset} className="text-black/30 hover:text-red-500 text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ml-2">
          <X className="w-3.5 h-3.5" /> Descartar
        </button>
      </div>

      {/* Sponsor Info Card Preview */}
      {sponsor && (
        <div className="w-full max-w-[400px] mt-6 p-6 bg-white rounded-3xl border border-black/5 shadow-sm space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-secondary/5 flex items-center justify-center p-2 border border-black/5">
              {sponsor.photo ? (
                <img src={sponsor.photo} className="w-full h-full object-contain" alt={sponsor.businessName} />
              ) : (
                <Store className="w-6 h-6 text-secondary" />
              )}
            </div>
            <div>
              <h4 className="text-sm font-black uppercase tracking-tight">{sponsor.businessName || sponsor.name}</h4>
              <p className="text-[9px] text-black/40 font-bold uppercase tracking-widest">Patrocinador Oficial</p>
            </div>
          </div>
          
          <div className="space-y-3 pt-2 border-t border-black/5">
            {sponsor.address && (
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-[10px] font-bold text-black/60 uppercase leading-relaxed">{sponsor.address}</p>
              </div>
            )}
            
            <div className="flex flex-wrap gap-3">
              {sponsor.locationLink && (
                <div className="flex-1 bg-gray-50 p-3 rounded-xl flex items-center justify-center gap-2">
                  <Navigation className="w-4 h-4 text-primary" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Ver Ubicación</span>
                </div>
              )}
              
              {sponsor.whatsapp && (
                <div 
                  className="flex-1 bg-green-50 p-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:bg-green-100 transition-colors"
                  onClick={() => window.open(`https://wa.me/${sponsor.whatsapp.replace(/\+/g, '').replace(/\s/g, '')}`, '_blank')}
                >
                  <MessageCircle className="w-4 h-4 text-green-500" />
                  <span className="text-[9px] font-black uppercase tracking-widest">WhatsApp</span>
                </div>
              )}

              {sponsor.website && (
                <div 
                  className="flex-1 bg-blue-50 p-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:bg-blue-100 transition-colors"
                  onClick={() => window.open(sponsor.website.startsWith('http') ? sponsor.website : `https://${sponsor.website}`, '_blank')}
                >
                  <Home className="w-4 h-4 text-blue-500" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Web</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

const SponsorModal = ({ sponsor, isOpen, onClose }: { sponsor: UserProfile; isOpen: boolean; onClose: () => void }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-[48px] shadow-2xl overflow-hidden border border-black/5"
          >
            <div className="absolute top-6 right-6 z-10">
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center text-black/40 hover:bg-black/10 hover:text-black transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 sm:p-10 space-y-8 max-h-[90vh] overflow-y-auto no-scrollbar">
              {/* Header: Logo & Name */}
              <div className="flex flex-col items-center text-center">
                <div className="w-40 h-40 sm:w-56 sm:h-56 flex items-center justify-center mb-4 relative">
                  {sponsor.photo ? (
                    <img src={sponsor.photo} className="w-full h-full object-contain relative z-10" alt={sponsor.businessName} />
                  ) : (
                    <Store className="w-24 h-24 text-secondary relative z-10" />
                  )}
                </div>
                <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter mb-2 leading-tight text-black">
                  {sponsor.businessName || 'Negocio Local'}
                </h3>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-secondary/10 rounded-full border border-secondary/5">
                  <ShieldCheck className="w-3 h-3 text-secondary" />
                  <span className="text-[9px] text-secondary font-black uppercase tracking-[0.2em]">Patrocinador Oficial</span>
                </div>
              </div>

              <div className="space-y-6">
                {/* Services Section */}
                {sponsor.services && sponsor.services.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 ml-1">
                       <Zap className="w-3 h-3 text-primary" />
                       <h4 className="text-[9px] font-black uppercase tracking-widest text-black/30">Servicios</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {sponsor.services.map((s, i) => (
                        <span key={i} className="bg-white text-black/80 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-black/5 shadow-sm">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contact & Location Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {sponsor.address && (
                    <div className="bg-gray-50/50 p-4 rounded-[24px] border border-black/5 flex items-start gap-4">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[8px] font-black uppercase tracking-widest text-black/20 mb-0.5">Ubicación</p>
                        <p className="text-[10px] font-bold text-black/70 uppercase leading-tight truncate">{sponsor.address}</p>
                      </div>
                    </div>
                  )}

                  {sponsor.whatsapp && (
                    <div className="bg-green-50/30 p-4 rounded-[24px] border border-green-500/10 flex items-start gap-4 group hover:bg-green-100/50 transition-colors cursor-pointer"
                      onClick={() => window.open(`https://wa.me/${sponsor.whatsapp.replace(/\+/g, '').replace(/\s/g, '')}`, '_blank')}
                    >
                      <div className="w-8 h-8 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <MessageCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[8px] font-black uppercase tracking-widest text-black/20 mb-0.5">WhatsApp</p>
                        <p className="text-[10px] font-black text-green-600 uppercase tracking-widest truncate">{sponsor.whatsapp}</p>
                      </div>
                    </div>
                  )}

                  {sponsor.website && (
                    <div className="bg-blue-50/30 p-4 rounded-[24px] border border-blue-500/10 flex items-start gap-4 group hover:bg-blue-100/50 transition-colors cursor-pointer"
                      onClick={() => window.open(sponsor.website.startsWith('http') ? sponsor.website : `https://${sponsor.website}`, '_blank')}
                    >
                      <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <Globe className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[8px] font-black uppercase tracking-widest text-black/20 mb-0.5">Sitio Web</p>
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest truncate">{sponsor.website.replace(/^https?:\/\//, '')}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Main Action Buttons */}
                <div className="flex flex-col gap-3 pt-2">
                  {sponsor.whatsapp && (
                    <a 
                      href={`https://wa.me/${sponsor.whatsapp.replace(/\+/g, '').replace(/\s/g, '')}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full bg-[#25D366] text-white hover:bg-[#128C7E] p-5 rounded-[20px] flex items-center justify-center gap-3 transition-all group shadow-xl active:scale-95 text-[11px] font-black uppercase tracking-widest"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Contactar por WhatsApp</span>
                    </a>
                  )}
                  {sponsor.website && (
                    <a 
                      href={sponsor.website.startsWith('http') ? sponsor.website : `https://${sponsor.website}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full bg-blue-600 text-white hover:bg-blue-700 p-5 rounded-[20px] flex items-center justify-center gap-3 transition-all group shadow-xl active:scale-95 text-[11px] font-black uppercase tracking-widest"
                    >
                      <Home className="w-4 h-4" />
                      <span>Visitar Sitio Web</span>
                    </a>
                  )}
                  {sponsor.locationLink && (
                    <a 
                      href={sponsor.locationLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full bg-black text-white hover:bg-primary p-5 rounded-[20px] flex items-center justify-center gap-3 transition-all group shadow-xl active:scale-95 text-[11px] font-black uppercase tracking-widest"
                    >
                      <Navigation className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      <span>Cómo Llegar (Maps)</span>
                    </a>
                  )}
                  <button 
                    onClick={onClose}
                    className="w-full bg-black/5 text-black/40 hover:bg-black/10 p-5 rounded-[20px] text-[11px] font-black uppercase tracking-widest transition-all"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Logo */}
              <div className="flex flex-col items-center pt-8 opacity-10">
                <img src="https://cossma.com.mx/cuponmania.png" className="h-6 grayscale" alt="Cuponmania" />
                <p className="text-[8px] font-black uppercase tracking-widest mt-2">Sello de autenticidad</p>
              </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const CouponCard = memo(({ coupon, onSave, onLike, isSaved, isLiked, sponsor, onShowSponsor }: { 
  coupon: CuponConfig; 
  onSave: (id: string) => void; 
  onLike: (id: string) => void;
  isSaved: boolean;
  isLiked: boolean;
  sponsor?: UserProfile | null;
  onShowSponsor: (s: UserProfile) => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        if (width === 0) return; // Wait for layout
        
        const safeWidth = Math.max(300, width);
        const newScale = Math.max(0.2, Math.min(1, (safeWidth - 16) / 1000));
        setScale(newScale);
      }
    };
    updateScale();

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      observer = new ResizeObserver(() => {
        // Use requestAnimationFrame for smoother updates and avoid loop errors
        requestAnimationFrame(updateScale);
      });
      observer.observe(containerRef.current);
    }
    
    window.addEventListener('resize', updateScale);
    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full flex flex-col gap-6">
      <div className="flex items-center gap-2 px-2">
        <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-primary/10">
          {normalizeCategory(coupon.data.categoria)}
        </span>
      </div>
      <motion.div 
        className="w-full relative overflow-visible flex justify-center items-start pt-2"
        style={{ height: `${550 * scale + 48}px` }}
      >
        <div className="flex justify-center overflow-hidden" style={{ width: `${1000 * scale}px`, height: `${550 * scale}px` }}>
          {coupon.imageData ? (
            <img 
              src={coupon.imageData} 
              className="w-full h-full object-contain" 
              alt="Coupon Image"
              loading="lazy"
            />
          ) : (
            <CouponTicket config={coupon} scale={scale} origin="origin-top" />
          )}
        </div>
      </motion.div>

      <div className="flex items-center justify-between gap-4 px-4 pb-2">
        <div className="flex-1 flex gap-2">
          <button 
            onClick={() => onLike(coupon.id)}
            className={`flex-1 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 border shadow-sm ${isLiked ? 'bg-red-500 text-white border-red-500 shadow-red-200 shadow-lg' : 'bg-white text-black/60 border-black/5 hover:bg-gray-50'}`}
          >
            <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
          </button>
          
          <button 
            onClick={() => onSave(coupon.id)}
            className={`flex-1 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 border shadow-sm ${isSaved ? 'bg-secondary text-white border-secondary shadow-lg' : 'bg-white text-black/60 border-black/5 hover:bg-gray-50'}`}
          >
            <Save className={`w-5 h-5 ${isSaved ? 'fill-current text-primary' : ''}`} />
          </button>
        </div>

        {sponsor && (
          <button 
            onClick={() => onShowSponsor(sponsor)}
            className="flex-1 bg-black text-white py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-xl shadow-black/10 active:scale-95 px-6 border border-white/10"
          >
            <Store className="w-5 h-5 text-primary" />
            <span>Info Negocio</span>
          </button>
        )}
      </div>
    </div>
  );
});


const MarketplaceView = ({ coupons, savedIds, likedIds, onSave, onLike, onShowFlyer, flyerLink, users, onShowSponsor, isLoading, isAdmin, onDelete }: { 
  coupons: CuponConfig[]; 
  savedIds: string[]; 
  likedIds: string[];
  onSave: (id: string) => void;
  onLike: (id: string) => void;
  onShowFlyer: () => void;
  flyerLink: string;
  users: UserProfile[];
  onShowSponsor: (sponsor: UserProfile) => void;
  isLoading?: boolean;
  isAdmin?: boolean;
  onDelete?: (id: string) => void;
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');

  const categories = useMemo(() => 
    ['Todos', ...Array.from(new Set(coupons.map(c => normalizeCategory(c.data.categoria))))].filter(Boolean),
    [coupons]
  );
  
  const filteredCoupons = useMemo(() => 
    selectedCategory === 'Todos' 
      ? coupons 
      : coupons.filter(c => normalizeCategory(c.data.categoria) === selectedCategory),
    [coupons, selectedCategory]
  );

  return (
    <div className="w-full h-full min-h-screen overflow-x-hidden pb-40 bg-gray-50/50">
      <div className="w-full max-w-[1500px] mx-auto px-0 md:px-6 pt-4 mb-12">
        <button 
          onClick={onShowFlyer}
          className="w-full relative group overflow-hidden active:scale-[0.98] transition-all bg-transparent flex items-center justify-center p-0"
        >
          <img 
            src={flyerLink || "https://cossma.com.mx/cuponmaniaflyer1.png"} 
            className="w-full h-auto max-h-[600px] object-contain group-hover:drop-shadow-2xl transition-all duration-700" 
            alt="Promociones Destacadas"
            loading="eager"
          />
        </button>
      </div>

      {/* Categories below Flyer */}
      <div className="max-w-[1500px] mx-auto px-6 md:px-12 pt-10">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2">
          {categories.map(cat => (
            <button 
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
                selectedCategory === cat 
                  ? 'bg-black text-white border-black shadow-xl shadow-black/20' 
                  : 'bg-white text-black/40 border-black/5 hover:border-black/20'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-[1500px] mx-auto p-6 md:p-12 pt-8">
      
      {isLoading && coupons.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-40">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-8" />
          <p className="text-sm font-black uppercase tracking-widest text-black/40 animate-pulse">Sincronizando beneficios exclusivos...</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 w-full mt-20 px-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse space-y-6">
                <div className="h-6 w-24 bg-gray-200 rounded-full" />
                <div className="aspect-[1000/600] bg-gray-200 rounded-[40px]" />
                <div className="flex gap-3">
                  <div className="h-14 flex-1 bg-gray-200 rounded-2xl" />
                  <div className="h-14 flex-1 bg-gray-200 rounded-2xl" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : filteredCoupons.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-black/20 bg-white rounded-[40px] border border-dashed border-black/10">
          <LayoutGrid className="w-16 h-16 mb-4 opacity-50" />
          <p className="font-black uppercase tracking-widest text-xs">No hay cupones disponibles en esta categoría</p>
          <button 
            onClick={() => setSelectedCategory('Todos')}
            className="mt-6 px-10 py-4 bg-gray-50 hover:bg-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-black/40 transition-all"
          >
            Ver todas las categorías
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
          {filteredCoupons.map(coupon => (
            <div key={coupon.id} className="space-y-4 group">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary/60 bg-primary/5 px-4 py-1 rounded-full">
                  {normalizeCategory(coupon.data.categoria)}
                </span>
                {isAdmin && onDelete && (
                  <button 
                    onClick={() => {
                      if (window.confirm('¿ELIMINAR ESTE CUPÓN DEFINITIVAMENTE DE LA RED?')) onDelete(coupon.id);
                    }}
                    className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    title="Eliminar como Administrador"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <CouponCard 
                key={coupon.id} 
                coupon={coupon} 
                onSave={onSave} 
                onLike={onLike}
                isSaved={savedIds.includes(coupon.id)} 
                isLiked={likedIds.includes(coupon.id)}
                sponsor={users.find(u => u.id === coupon.creatorId)}
                onShowSponsor={onShowSponsor}
              />
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
};

const WalletView = ({ coupons, savedIds, likedIds, onSave, onLike, users, onShowSponsor }: { 
  coupons: CuponConfig[]; 
  savedIds: string[]; 
  likedIds: string[];
  onSave: (id: string) => void;
  onLike: (id: string) => void;
  users: UserProfile[];
  onShowSponsor: (sponsor: UserProfile) => void;
}) => {
  const now = new Date();
  const savedCoupons = coupons.filter(c => {
    if (!savedIds.includes(c.id)) return false;
    // Auto-delete (filter out) if expired
    if (c.data.cronometro.fecha_fin) {
      const expirationDate = new Date(c.data.cronometro.fecha_fin);
      // We set expiration to the end of the day usually, or based on timestamp_final
      const finalTime = c.data.cronometro.timestamp_final ? new Date(c.data.cronometro.timestamp_final) : expirationDate;
      if (now > finalTime) return false;
    }
    return true;
  });

  return (
    <div className="w-full h-full p-6 md:p-12 overflow-x-hidden">
      <div className="mb-8 md:mb-12">
        <h2 className="text-xl sm:text-3xl md:text-4xl font-black uppercase tracking-tighter mb-2">Mi Cuponera</h2>
        <p className="text-[10px] md:text-sm text-black/40 uppercase font-bold tracking-widest">Tus beneficios guardados</p>
      </div>

      {savedCoupons.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-black/20">
          <Heart className="w-16 h-16 mb-4" />
          <p className="font-bold uppercase tracking-widest">Tu cuponera está vacía</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
          {savedCoupons.map(coupon => (
            <CouponCard 
              key={coupon.id} 
              coupon={coupon} 
              onSave={onSave} 
              onLike={onLike}
              isSaved={true} 
              isLiked={likedIds.includes(coupon.id)}
              sponsor={users.find(u => u.id === coupon.creatorId)}
              onShowSponsor={onShowSponsor}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const ProfileView = ({ user, onUpdate }: { user: UserProfile; onUpdate: (user: UserProfile) => void }) => {
  const [profile, setProfile] = useState<UserProfile>(user);
  const [newService, setNewService] = useState('');

  useEffect(() => {
    setProfile(user);
  }, [user]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const updated = { ...profile, photo: reader.result as string };
        setProfile(updated);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    // Validaciones básicas
    if (!profile.name) {
      alert("El nombre es requerido");
      return;
    }
    onUpdate(profile);
  };

  return (
    <div className="w-full h-full p-6 md:p-16 max-w-[1400px] mx-auto overflow-y-auto pb-40">
      <header className="mb-12 border-b border-black/5 pb-8">
        <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase mb-3 leading-none">Mi Perfil</h2>
        <div className="flex items-center gap-4">
          <div className="w-12 h-1.5 bg-primary" />
          <p className="text-black/40 font-bold uppercase text-[11px] tracking-widest">Configuración de identidad y negocio</p>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row items-center gap-8 bg-white p-6 sm:p-10 rounded-[40px] border border-black/5 shadow-xl">
          <label className="relative group cursor-pointer block shrink-0">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-[40%] bg-secondary flex items-center justify-center text-white text-3xl font-black overflow-hidden border-4 border-white shadow-xl">
              {profile.photo ? (
                <img src={profile.photo} className="w-full h-full object-cover" />
              ) : (
                profile.name.charAt(0)
              )}
            </div>
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-[40%] flex items-center justify-center">
              <Camera className="w-8 h-8 text-white" />
            </div>
            <input type="file" className="hidden" accept="image/*" onChange={handlePhotoChange} />
          </label>
          <div className="text-center sm:text-left flex-1 min-w-0">
            <h3 className="text-xl font-black uppercase tracking-tight truncate">{profile.name}</h3>
            <p className="text-sm text-black/40 font-bold uppercase tracking-widest truncate">@{profile.username}</p>
            <div className="mt-4 flex flex-wrap gap-2 justify-center sm:justify-start">
               <span className="bg-primary/10 text-primary px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest">
                Cuenta Verificada
              </span>
              <span className="bg-secondary/10 text-secondary px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest">
                {profile.role}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[11px] uppercase text-black/40 tracking-[0.1em] font-black ml-4">Nombre Completo del Representante</label>
            <input 
              type="text" 
              value={profile.name}
              onChange={e => setProfile({ ...profile, name: e.target.value })}
              className="w-full bg-white border border-black/5 rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] uppercase text-black/40 tracking-[0.1em] font-black ml-4">Email</label>
            <input 
              type="email" 
              value={profile.email}
              onChange={e => setProfile({ ...profile, email: e.target.value })}
              className="w-full bg-white border border-black/5 rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] uppercase text-black/40 tracking-[0.1em] font-black ml-4">Teléfono (WhatsApp)</label>
            <input 
              type="text" 
              value={profile.whatsapp || ''}
              onChange={e => setProfile({ ...profile, whatsapp: e.target.value })}
              className="w-full bg-white border border-black/5 rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
              placeholder="+52 ..."
            />
          </div>
          {(profile.role === 'patrocinador' || profile.role === 'admin') && (
            <>
              <div className="space-y-2">
                <label className="text-[11px] uppercase text-black/40 tracking-[0.1em] font-black ml-4">Nombre del Negocio</label>
                <input 
                  type="text" 
                  value={profile.businessName || ''}
                  onChange={e => setProfile({ ...profile, businessName: e.target.value })}
                  className="w-full bg-white border border-black/5 rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] uppercase text-black/40 tracking-[0.1em] font-black ml-4">Dirección Comercial</label>
                <input 
                  type="text" 
                  value={profile.address || ''}
                  onChange={e => setProfile({ ...profile, address: e.target.value })}
                  className="w-full bg-white border border-black/5 rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] uppercase text-black/40 tracking-[0.1em] font-black ml-4">Link Google Maps (Ubicación)</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                  <input 
                    type="text" 
                    value={profile.locationLink || ''}
                    onChange={e => setProfile({ ...profile, locationLink: e.target.value })}
                    className="w-full bg-white border border-black/5 rounded-2xl pl-12 pr-4 py-4 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
                    placeholder="https://maps.app.goo.gl/..."
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] uppercase text-black/40 tracking-[0.1em] font-black ml-4">Página Web (Sitio Oficial)</label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                  <input 
                    type="text" 
                    value={profile.website || ''}
                    onChange={e => setProfile({ ...profile, website: e.target.value })}
                    className="w-full bg-white border border-black/5 rounded-2xl pl-12 pr-4 py-4 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
                    placeholder="https://www.tuweb.com"
                  />
                </div>
              </div>
              
              <div className="col-span-full space-y-4 pt-4 border-t border-black/5">
                <label className="text-[11px] uppercase text-black/40 tracking-[0.1em] font-black ml-4">Servicios y Productos que Ofrece</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Agregar servicio o producto..."
                    className="flex-1 bg-white border border-black/5 rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
                    value={newService}
                    onChange={e => setNewService(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newService.trim()) {
                        setProfile(p => ({ ...p, services: [...(p.services || []), newService.trim()] }));
                        setNewService('');
                      }
                    }}
                  />
                  <button 
                    onClick={() => {
                      if (newService.trim()) {
                        setProfile(p => ({ ...p, services: [...(p.services || []), newService.trim()] }));
                        setNewService('');
                      }
                    }}
                    className="bg-primary text-white p-4 rounded-2xl shadow-lg active:scale-95 transition-all"
                  >
                    <Tag className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(profile.services || []).map((s, i) => (
                    <span key={i} className="bg-secondary/10 text-secondary px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 border border-secondary/10">
                      {s}
                      <button onClick={() => setProfile(p => ({ ...p, services: (p.services || []).filter((_, idx) => idx !== i) }))}>
                        <X className="w-4 h-4 text-red-500" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
          <div className="space-y-2">
            <label className="text-[11px] uppercase text-black/40 tracking-[0.1em] font-black ml-4">Contraseña Actual/Nueva</label>
            <input 
              type="password" 
              placeholder="••••••••"
              className="w-full bg-white border border-black/5 rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
            />
          </div>
        </div>

        <button 
          onClick={handleSave}
          className="w-full bg-black text-white py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-primary transition-all active:scale-95"
        >
          Guardar Cambios
        </button>
        
        <button 
          onClick={() => {
             localStorage.removeItem('cuponmania_user');
             window.location.reload();
          }}
          className="w-full mt-4 text-[10px] font-black uppercase text-red-500 hover:text-red-600 transition-all tracking-[0.2em]"
        >
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
};

const SponsorDashboard = ({ coupons, onTogglePublish, onDelete }: { coupons: CuponConfig[]; onTogglePublish: (id: string, status: boolean) => void; onDelete: (id: string) => void }) => {
  return (
    <div className="w-full h-full p-6 md:p-12 overflow-x-hidden pb-32">
      <div className="mb-8 md:mb-12">
        <h2 className="text-xl sm:text-3xl md:text-4xl font-black uppercase tracking-tighter mb-2">Mis Cupones</h2>
        <p className="text-[10px] md:text-sm text-black/40 uppercase font-bold tracking-widest">Historial de promociones generadas</p>
      </div>

      {coupons.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-black/20 text-center">
          <Briefcase className="w-16 h-16 mb-4" />
          <p className="font-bold uppercase tracking-widest">Aún no has guardado ningún cupón</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-black/5">
          {coupons.map(coupon => (
            <div key={coupon.id} className="py-8 flex flex-col sm:flex-row items-center gap-6 sm:gap-12 group">
              <div className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center p-2 transition-transform group-hover:scale-105 shrink-0">
                <img src={coupon.data.header.logo_url || "https://cossma.com.mx/cuponmania.png"} alt="" className="w-full h-full object-contain" />
              </div>
              
              <div className="flex-1 text-center sm:text-left min-w-0">
                <h4 className="font-black uppercase tracking-tight text-base sm:text-lg mb-1 leading-tight">{coupon.data.oferta.texto}</h4>
                <div className="flex flex-wrap justify-center sm:justify-start items-center gap-4 mt-2">
                  <span className="text-[11px] font-black text-black/30 uppercase tracking-[0.1em]">
                    {new Date(coupon.publishedAt).toLocaleDateString()}
                  </span>
                  <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${coupon.isPublished ? 'bg-green-500/10 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                    {coupon.isPublished ? 'PUBLIKADO EN RED' : 'BORRADOR PRIVADO'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10 shrink-0 w-full sm:w-auto">
                <div className="text-right hidden lg:block">
                  <span className="block text-[9px] font-black uppercase text-black/20 tracking-widest mb-1">CÓDIGO</span>
                  <span className="font-mono font-bold text-2xl tracking-widest text-primary">{coupon.data.diseno.codigo_canje.valor}</span>
                </div>
                
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button 
                    onClick={() => onTogglePublish(coupon.id, !!coupon.isPublished)}
                    className={`flex-1 sm:flex-none px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${coupon.isPublished ? 'bg-red-50 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-secondary text-white shadow-lg shadow-secondary/20 hover:scale-105'}`}
                  >
                    {coupon.isPublished ? 'Retirar' : 'Publicar'}
                  </button>
                  
                  <button 
                    onClick={() => {
                      if (window.confirm('¿Estás seguro de que quieres eliminar este cupón permanentemente?')) {
                        onDelete(coupon.id);
                      }
                    }}
                    className="p-4 bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-2xl transition-all"
                    title="Eliminar permanentemente"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- PWA Install Prompt ---

const PwaInstallPrompt = ({ onInstall, onDismiss }: { onInstall: () => void; onDismiss: () => void }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      className="fixed bottom-24 left-4 right-4 md:left-auto md:right-8 md:w-96 z-[200]"
    >
      <div className="bg-white rounded-[32px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-black/5 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4">
          <button onClick={onDismiss} className="p-2 text-black/20 hover:text-black transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex flex-col items-center text-center gap-6">
          <div className="w-24 h-24 bg-primary/5 rounded-[30%] flex items-center justify-center p-4">
            <img src="https://cossma.com.mx/cuponmania.png" alt="Cuponmanía" className="w-full h-full object-contain" />
          </div>
          
          <div>
            <h3 className="text-2xl font-black uppercase tracking-tighter mb-2">Instala Cuponmanía</h3>
            <p className="text-sm text-black/50 font-medium leading-relaxed">
              Accede a tus cupones favoritos al instante desde tu pantalla de inicio, sin navegadores.
            </p>
          </div>
          
          <button 
            onClick={onInstall}
            className="w-full bg-primary text-white py-5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-105 transition-all flex items-center justify-center gap-3"
          >
            <Download className="w-5 h-5" />
            INSTALAR APP
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// --- Main App ---

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('cuponmania_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isFlyerFullscreen, setIsFlyerFullscreen] = useState(false);
  const [flyerLinks, setFlyerLinks] = useState({ 
    flyer1: 'https://cossma.com.mx/cuponmaniaflyer1.png', 
    flyer2: 'https://cossma.com.mx/cuponmaniaflyer2.png' 
  });

  const fetchFlyerSettings = async () => {
    try {
      // Intento de recuperación local primero (rápido)
      const savedLocal = localStorage.getItem('flyer_links_local');
      if (savedLocal) {
        setFlyerLinks(JSON.parse(savedLocal));
      }

      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'flyer_links')
        .single();
      
      if (!error && data) {
        setFlyerLinks(data.value);
        localStorage.setItem('flyer_links_local', JSON.stringify(data.value));
      }
    } catch (err) {
      console.warn('Settings table fetch failed:', err);
    }
  };

  const updateFlyerSettings = async (newLinks: { flyer1: string; flyer2: string }) => {
    // Siempre guardamos localmente como fallback
    localStorage.setItem('flyer_links_local', JSON.stringify(newLinks));
    setFlyerLinks(newLinks);

    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key: 'flyer_links', value: newLinks }, { onConflict: 'key' });
      
      if (!error) {
        showFeedback('Configuración del flyer actualizada');
        setActiveView('admin_dashboard');
      } else {
        console.error('Supabase error:', error);
        // Informamos pero ya actualizamos localmente
        showFeedback('Actualizado localmente', 'success');
      }
    } catch (err) {
      console.error('Error updating settings:', err);
      showFeedback('Actualizado localmente', 'success');
    }
  };

  useEffect(() => {
    fetchFlyerSettings();
  }, []);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeAlert, setActiveAlert] = useState<{ title: string; message: string } | null>(null);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        showFeedback('¡Notificaciones activadas!');
      }
    }
  };

  const fetchNotifications = async () => {
    if (!currentUser) return;
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchNotifications();
      requestNotificationPermission();
      
      // Setup realtime listener for notifications
      const supabase = getSupabase();
      const channel = supabase
        .channel('notifications_changes')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${currentUser.id}`
        }, (payload) => {
          fetchNotifications();
          // If it's a new coupon notification, show flashy alert
          if (payload.new.title.includes('Cupón')) {
            setActiveAlert({
              title: payload.new.title,
              message: payload.new.message
            });
            // Auto hide after 10 seconds
            setTimeout(() => setActiveAlert(null), 10000);
          }
        })
        .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentUser]);

  const markNotificationAsRead = async (id: string) => {
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
      if (!error) fetchNotifications();
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);
      if (!error) {
        showFeedback('Notificación eliminada');
        fetchNotifications();
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const clearAllNotifications = async () => {
    if (!currentUser) return;
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', currentUser.id);
      if (!error) {
        showFeedback('Bandeja de entrada vaciada');
        fetchNotifications();
      }
    } catch (err) {
      console.error('Error clearing notifications:', err);
    }
  };

  const createCouponNotification = async (couponName: string) => {
    try {
      const supabase = getSupabase();
      // Usamos el RPC para enviar de forma masiva y eficiente en el servidor
      await supabase.rpc('send_broadcast_notification', {
        p_title: '¡Nuevo Cupón Disponible!',
        p_message: `Se ha publicado el cupón: ${couponName}. ¡Aprovéchalo ahora!`,
        p_type: 'success',
        p_target_role: 'all'
      });
    } catch (err) {
      console.error('Error creating notification:', err);
    }
  };


  const showFeedback = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('cuponmania_user');
    setActiveView('marketplace');
    showFeedback('Sesión cerrada correctamente');
  };

  const [users, setUsers] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem('cuponmania_users_list');
    const adminUser: UserProfile = {
      id: 'admin-1',
      role: 'admin',
      name: 'Harold Anguiano',
      username: 'appdesign',
      email: 'harold.anguiano@appdesignproyectos.com',
      whatsapp: '55 0000 0000',
      isActive: true,
      createdAt: new Date().toISOString()
    };
    if (!saved) return [adminUser];
    const list = JSON.parse(saved);
    if (!list.find((u: any) => u.username === 'appdesign')) {
      return [...list, adminUser];
    }
    return list;
  });

  useEffect(() => {
    localStorage.setItem('cuponmania_users_list', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('cuponmania_user', JSON.stringify(currentUser));
      setCurrentRole(currentUser.role);
    } else {
      localStorage.removeItem('cuponmania_user');
    }
  }, [currentUser]);

  // Session Repair Effect: Si el ID del usuario no es un UUID válido, intentamos sincronizarlo
  useEffect(() => {
    const repairSession = async () => {
      if (currentUser && !currentUser.id.includes('-')) {
        console.log('Detectada sesión antigua sin UUID. Reparando...');
        try {
          // Intentamos obtener el perfil real de Supabase basándonos en el username
          const repaired = await upsertProfile(currentUser);
          if (repaired && repaired.id.includes('-')) {
            setCurrentUser(repaired);
          }
        } catch (e) {
          console.error('Error reparando sesión:', e);
        }
      }
    };
    repairSession();
  }, [currentUser]);

  const fetchProfiles = async () => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) {
        console.error('Error fetching profiles from Supabase:', error.message);
        return;
      }
      if (data) {
        const formatted = data.map(p => {
          let servicesArray: string[] = [];
          if (Array.isArray(p.services)) {
            servicesArray = p.services;
          } else if (typeof p.services === 'string') {
            try {
              servicesArray = JSON.parse(p.services);
            } catch (e) {
              servicesArray = p.services.split(',').map((s: any) => s.trim()).filter(Boolean);
            }
          }

          return {
            id: p.id,
            username: p.username,
            email: p.email,
            name: p.name,
            role: p.role as UserRole,
            whatsapp: p.whatsapp,
            photo: p.photo,
            businessName: p.business_name,
            representativeName: p.representative_name,
            address: p.address,
            locationLink: p.location_link,
            website: p.website,
            services: servicesArray,
            isActive: p.is_active,
            createdAt: p.created_at
          };
        });
        setUsers(formatted);
        localStorage.setItem('cuponmania_users_list', JSON.stringify(formatted));

        // Actualizar datos del usuario actual si está en la lista (Sincronización en tiempo real)
        if (currentUser) {
          const myLatestData = formatted.find(u => u.username === currentUser.username);
          if (myLatestData) {
             const hasChanged = JSON.stringify(myLatestData) !== JSON.stringify(currentUser);
             if (hasChanged) {
                console.log('Sincronizando perfil del usuario actual con DB...');
                setCurrentUser(myLatestData);
             }
          }
        }
      }
    } catch (err) {
      console.error('Critical error fetching profiles:', err);
    }
  };

  const upsertProfile = async (profile: UserProfile): Promise<UserProfile | null> => {
    try {
      const supabase = getSupabase();
      
      const payload = {
        id: (profile.id && profile.id.includes('-')) ? profile.id : crypto.randomUUID(),
        username: profile.username,
        email: profile.email,
        name: profile.name,
        role: profile.role,
        whatsapp: profile.whatsapp,
        photo: profile.photo,
        business_name: profile.businessName,
        representative_name: profile.representativeName,
        address: profile.address,
        location_link: profile.locationLink,
        website: profile.website,
        services: Array.isArray(profile.services) ? profile.services : [],
        is_active: profile.isActive
      };

      console.log('Attempting upsert for profile:', profile.username);
      
      const { data, error } = await supabase.from('profiles').upsert(payload, { 
        onConflict: 'username',
        ignoreDuplicates: false 
      }).select().single();
      
      if (error) {
        console.error('Upsert failed:', error.message, error.details, error.hint);
        throw error;
      }
      
        if (data) {
          // No llamamos a fetchProfiles inmediatamente aquí para evitar loops, 
          // pero el return ya lleva la data fresca.
          const freshProfile: UserProfile = {
            id: data.id,
            role: data.role as UserRole,
            name: data.name,
            username: data.username,
            email: data.email,
            whatsapp: data.whatsapp,
            businessName: data.business_name,
            representativeName: data.representative_name,
            address: data.address,
            locationLink: data.location_link,
            website: data.website,
            photo: data.photo,
            isActive: data.is_active,
            services: Array.isArray(data.services) ? data.services : [],
            createdAt: data.created_at
          };
          
          // Actualizar estado local inmediatamente
          setUsers(prev => prev.map(u => u.id === data.id ? freshProfile : u));
          return freshProfile;
        }
      return null;
    } catch (err) {
      console.error('Critical error in upsertProfile:', err);
      throw err; // Re-throw to be caught by AuthView
    }
  };

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isFetchingCoupons, setIsFetchingCoupons] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [viewingSponsor, setViewingSponsor] = useState<UserProfile | null>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Solo mostrar si no se ha descartado antes en esta sesión
      const dismissed = sessionStorage.getItem('cuponmania_install_dismissed');
      if (!dismissed) {
        setShowInstallPrompt(true);
      }
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsAppInstalled(true);
      showFeedback('¡App instalada con éxito!', 'success');
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsAppInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleDismissInstall = () => {
    setShowInstallPrompt(false);
    sessionStorage.setItem('cuponmania_install_dismissed', 'true');
  };
  const [coupon, setCoupon] = useState<CuponConfig | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    return (localStorage.getItem('cuponmania_role') as UserRole) || 'usuario';
  });
  const [activeView, setActiveView] = useState<AppView>(() => {
    const saved = localStorage.getItem('cuponmania_active_view');
    return (saved as AppView) || 'marketplace';
  });

  useEffect(() => {
    localStorage.setItem('cuponmania_active_view', activeView);
    setIsSidebarOpen(false);
  }, [activeView, setIsSidebarOpen]);
  
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [currentUser?.role]);

  useEffect(() => {
    if (currentUser?.role) {
      setCurrentRole(currentUser.role);
    }
  }, [currentUser?.role]);

  const [publishedCoupons, setPublishedCoupons] = useState<CuponConfig[]>([]);

  const activeCoupons = useMemo(() => {
    if (!publishedCoupons.length) return [];

    return publishedCoupons.filter(coupon => {
      // 1. Prioridad: Admin y Creador ven siempre sus cupones
      if (currentRole === 'admin') return true;
      if (currentUser && coupon.creatorId === currentUser.id) return true;
      
      // 2. Si no hay lista de perfiles, permitimos ver por defecto
      if (!users || users.length <= 1) return true; // <= 1 porque admin se autoincluye

      const creator = users.find(u => u.id === coupon.creatorId);
      // 3. Solo filtramos si el perfil dice explícitamente que no está activo
      if (!creator) return true;
      return creator.isActive !== false;
    });
  }, [publishedCoupons, users, currentUser, currentRole]);

  const existingCategories = Array.from(new Set(activeCoupons.map(c => normalizeCategory(c.data.categoria)))).filter(Boolean);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [likedIds, setLikedIds] = useState<string[]>(() => {
    const stored = localStorage.getItem('cuponmania_liked');
    return stored ? JSON.parse(stored) : [];
  });

  const adminMetrics: AdminMetrics = {
    totalUsers: users.length,
    totalSponsors: users.filter(u => u.role === 'patrocinador' && u.isActive).length,
    totalCoupons: activeCoupons.length,
    totalRevenue: activeCoupons.length * 1500, // Valor simulado
    dailyActiveUsers: Math.floor(users.length * 0.4) + 1
  };

  useEffect(() => {
    localStorage.setItem('cuponmania_liked', JSON.stringify(likedIds));
  }, [likedIds]);

  const handleLikeCoupon = (couponId: string) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    const isLiking = !likedIds.includes(couponId);
    setLikedIds(prev => isLiking ? [...prev, couponId] : prev.filter(id => id !== couponId));
    if (isLiking) showFeedback('¡Te gusta este cupón!');
  };

  const [formData, setFormData] = useState<BusinessData>({
    nombre_negocio: '',
    rubro: '',
    categoria: '',
    oferta_principal: '',
    detalles_adicionales: '',
    horas_vigencia: '24',
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    logo_data: '',
    website: ''
  });

  // Auto-sync generator form with sponsor profile
  useEffect(() => {
    if (activeView === 'generator' && currentUser?.role === 'patrocinador') {
      // If the brand name in the form doesn't match the current user's business name, we reset
      if (formData.nombre_negocio !== currentUser.businessName) {
        setFormData({
          nombre_negocio: currentUser.businessName || '',
          rubro: '',
          categoria: '',
          oferta_principal: '',
          detalles_adicionales: '',
          horas_vigencia: '24',
          fecha_inicio: new Date().toISOString().split('T')[0],
          fecha_fin: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          logo_data: currentUser.photo || '',
          website: currentUser.website || ''
        });
      }
    }
  }, [activeView, currentUser?.id]);

  // Fetch coupons from Supabase
  const fetchCoupons = async () => {
    // Si ya estamos cargando o no hay cambios, no volvemos a disparar si hay data reciente en local
    // Pero forzamos la carga inicial.
    setIsFetchingCoupons(true);
    try {
      const supabase = getSupabase();
      let query = supabase.from('coupons').select('*');
      
      if (currentRole === 'admin') {
        // No filter
      } else if (currentUser) {
        if (currentRole === 'patrocinador') {
          query = query.or(`is_published.eq.true,creator_id.eq.${currentUser.id}`);
        } else {
          query = query.eq('is_published', true);
        }
      } else {
        query = query.eq('is_published', true);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      if (data) {
        const formatted = data.map(dbCoupon => ({
          id: dbCoupon.id,
          publishedAt: dbCoupon.created_at,
          isPublished: dbCoupon.is_published,
          creatorId: dbCoupon.creator_id,
          imageData: dbCoupon.image_data,
          status: dbCoupon.status,
          data: {
            header: { nombre_negocio: dbCoupon.nombre_negocio, logo_url: dbCoupon.logo_url },
            oferta: { texto: dbCoupon.oferta_texto, size: 'hero' },
            categoria: dbCoupon.categoria || 'General',
            condiciones: dbCoupon.condiciones,
            cronometro: { 
              horas_totales: 24, 
              timestamp_final: dbCoupon.timestamp_final,
              fecha_inicio: dbCoupon.fecha_inicio,
              fecha_fin: dbCoupon.fecha_fin
            },
            branding: { watermark_url: '', position: 'bottom-right' },
            diseno: { 
              color_primario: dbCoupon.color_primario, 
              color_acento: '#F57C00',
              codigo_canje: { tipo: 'QR', valor: dbCoupon.codigo_canje }
            }
          }
        })) as CuponConfig[];
        setPublishedCoupons(formatted);
      }
    } catch (error) {
      console.error('Error fetching coupons:', error);
    } finally {
      setIsFetchingCoupons(false);
    }
  };

  // Carga inicial optimizada y sincronización de rol
  useEffect(() => {
    if (currentUser?.role && currentUser.role !== currentRole) {
      console.log('Sincronizando rol detectado:', currentUser.role);
      setCurrentRole(currentUser.role);
    }
    
    // Carga paralela con prioridad
    const loadData = async () => {
      try {
        await Promise.all([
          fetchCoupons(),
          fetchProfiles(),
          currentUser ? fetchSavedCoupons() : Promise.resolve()
        ]);
        
        // Cargar flyers
        const supabase = getSupabase();
        const { data: flyerData } = await supabase.from('settings').select('*').eq('key', 'flyers').single();
        if (flyerData) {
          setFlyerLinks(flyerData.value);
        }
      } catch (err) {
        console.warn('Initial data load partially failed:', err);
      }
    };
    
    loadData();
  }, [currentUser?.id, currentUser?.role]);

  const fetchSavedCoupons = async () => {
    if (!currentUser) return;
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('saved_coupons')
        .select('coupon_id')
        .eq('user_id', currentUser.id);
      
      if (error) throw error;
      if (data) {
        setSavedIds(data.map(item => item.coupon_id));
      }
    } catch (error) {
      console.error('Error fetching saved coupons:', error);
    }
  };

  useEffect(() => {
    let channel: any;
    
    const setupRealtime = async () => {
      try {
        const supabase = getSupabase();
        // Fetch saved only if logged in
        if (currentUser) {
          await fetchSavedCoupons();
        }
        
        channel = supabase
          .channel('schema-db-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'coupons' }, () => fetchCoupons())
          .on('postgres_changes', { event: '*', schema: 'public', table: 'saved_coupons' }, () => {
            if (currentUser) fetchSavedCoupons();
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
            fetchProfiles();
            fetchCoupons(); // Re-fetch to reflect status changes immediately
          })
          .subscribe();
      } catch (err) {
        console.warn('Realtime setup postponed');
      }
    };

    setupRealtime();

    return () => {
      if (channel) {
        const supabase = getSupabase();
        supabase.removeChannel(channel);
      }
    };
  }, [currentUser, currentRole]);

  useEffect(() => {
    localStorage.setItem('cuponmania_role', currentRole);
  }, [currentRole]);

  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    if (role === 'usuario') setActiveView('marketplace');
    else if (role === 'patrocinador') setActiveView('generator');
    else if (role === 'admin') setActiveView('admin_dashboard');
  };

  const handleSaveCoupon = async (couponId: string) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    
    setLoading(true);
    try {
      const supabase = getSupabase();
      
      // Asegurar UUID
      let userId = currentUser.id;
      if (!userId.includes('-')) {
        const synced = await upsertProfile(currentUser);
        if (synced && synced.id.includes('-')) {
          userId = synced.id;
          setCurrentUser(synced);
        } else {
          showFeedback('Inicia sesión de nuevo para guardar cupones', 'error');
          setLoading(false);
          return;
        }
      }

      if (savedIds.includes(couponId)) {
        const { error } = await supabase
          .from('saved_coupons')
          .delete()
          .match({ user_id: userId, coupon_id: couponId });
        
        if (!error) {
          setSavedIds(prev => prev.filter(id => id !== couponId));
          showFeedback('Cupón eliminado de tu cuponera');
        }
      } else {
        const { error } = await supabase
          .from('saved_coupons')
          .insert([{ user_id: userId, coupon_id: couponId }]);
        
        if (!error) {
          setSavedIds(prev => [...prev, couponId]);
          showFeedback('¡Cupón guardado con éxito!');
        }
      }
    } catch (error) {
      console.error('Error saving coupon:', error);
    } finally {
      setLoading(false);
    }
  };

  const publishCoupon = async (isPublic: boolean = false, imageData?: string) => {
    if (!coupon || !currentUser) return;
    setLoading(true);
    
    try {
      const supabase = getSupabase();
      
      // EXTREME FIX: Si el ID actual no es un UUID (no tiene guiones), 
      // forzamos una sincronización con Supabase para obtener uno válido.
      let finalUserId = currentUser.id;
      if (!finalUserId.includes('-')) {
        const syncedProfile = await upsertProfile(currentUser);
        if (syncedProfile && syncedProfile.id.includes('-')) {
          finalUserId = syncedProfile.id;
          setCurrentUser(syncedProfile);
        } else {
          showFeedback('Error de identidad digital. Por favor, cierra sesión y vuelve a entrar.', 'error');
          setLoading(false);
          return;
        }
      }

      // Aseguramos que tenemos un logo válido
      const finalLogo = formData.logo_data || 
                        (currentUser?.role === 'patrocinador' ? currentUser.photo : null) || 
                        coupon.data.header.logo_url;

      const { error } = await supabase.from('coupons').insert([{
        nombre_negocio: coupon.data.header.nombre_negocio,
        logo_url: finalLogo,
        oferta_texto: coupon.data.oferta.texto,
        categoria: normalizeCategory(coupon.data.categoria),
        condiciones: coupon.data.condiciones,
        color_primario: coupon.data.diseno.color_primario,
        codigo_canje: coupon.data.diseno.codigo_canje.valor,
        fecha_inicio: coupon.data.cronometro.fecha_inicio,
        fecha_fin: coupon.data.cronometro.fecha_fin,
        timestamp_final: coupon.data.cronometro.timestamp_final,
        creator_id: finalUserId,
        is_published: isPublic,
        image_data: imageData
      }]);

      if (error) {
        console.error('Error saving/publishing:', error);
        showFeedback('Error al procesar: ' + (error.message || 'vuelve a intentar'), 'error');
      } else {
        const businessName = coupon.data.header.nombre_negocio;
        setCoupon(null);
        showFeedback(isPublic ? '¡Cupón publicado con éxito!' : 'Cupón guardado como borrador');
        if (isPublic) createCouponNotification(businessName);
        fetchCoupons();
      }
    } catch (error) {
      console.error('Supabase error:', error);
      showFeedback('Error de conexión', 'error');
    } finally {
      setLoading(false);
    }
  };

  const togglePublishStatus = async (couponId: string, currentStatus: boolean) => {
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('coupons')
        .update({ is_published: !currentStatus })
        .eq('id', couponId);
      
      if (error) throw error;
      showFeedback(!currentStatus ? '¡Cupón publicado!' : 'Cupón retirado');
      if (!currentStatus) {
        const couponToNotify = publishedCoupons.find(c => c.id === couponId);
        if (couponToNotify) createCouponNotification(couponToNotify.data.header.nombre_negocio);
      }
      fetchCoupons();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleDeleteCoupon = async (couponId: string) => {
    try {
      setLoading(true);
      const supabase = getSupabase();
      
      console.log('Intentando eliminar cupón:', couponId, 'Rol:', currentRole);
      
      const { error, count } = await supabase
        .from('coupons')
        .delete({ count: 'exact' })
        .eq('id', couponId);
      
      if (error) {
        console.error('Error de Supabase al borrar:', error);
        throw error;
      }
      
      if (count === 0) {
        console.warn('No se eliminó ningún registro. Posible problema de RLS.');
        showFeedback('No tienes permisos suficientes para eliminar este cupón en el servidor', 'error');
        // Re-fetch to sync UI
        fetchCoupons();
        return;
      }
      
      // Optimistic update
      setPublishedCoupons(prev => prev.filter(c => c.id !== couponId));
      showFeedback('Cupón eliminado definitivamente');
      
      // Also refresh to be sure
      fetchCoupons();
    } catch (error) {
      console.error('Error deleting coupon fatal:', error);
      showFeedback('Error al eliminar el cupón', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nombre_negocio || !formData.oferta_principal) {
      showFeedback('Por favor completa el nombre del negocio y la oferta principal', 'error');
      return;
    }

    setToast(null); // Clear previous messages
    setLoading(true);
    // Limpiamos el cupón anterior para evitar confusión si la nueva generación tarda o falla
    setCoupon(null);
    
    try {
      const response = await generateCoupon(formData);
      if (response && response.result) {
        setCoupon(response.result);
        showFeedback('¡Cupón generado con éxito!', 'success');
      } else {
        throw new Error('La respuesta de la IA llegó vacía o es inválida');
      }
    } catch (error: any) {
      console.error("Error generating coupon:", error);
      showFeedback(`No se pudo generar el cupón: ${error.message || 'Error de conexión con la IA'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderGeneratorForm = () => (
    <div className="p-8 flex flex-col gap-8 flex-1">
      <section className="pt-6">
        <div className="mb-6">
          <h3 className="text-[11px] uppercase tracking-[0.2em] text-secondary mb-2 font-black">
            NUEVO CUPÓN
          </h3>
          <p className="text-[10px] text-black/40 uppercase font-bold tracking-widest">Crea una nueva oferta increíble</p>
        </div>
      
      <form onSubmit={handleSubmit} className="space-y-8 pb-10">
        <div className="space-y-6">
          {/* Logo Upload Section */}
          <div className="space-y-3">
            <label className="text-[11px] uppercase text-black/50 tracking-[0.1em] font-black flex items-center gap-2">
              <Palette className="w-3.5 h-3.5" /> Logo de Marca
            </label>
            <label className="group relative flex flex-col items-center justify-center w-full h-40 bg-gray-50 border-2 border-dashed border-black/10 rounded-3xl cursor-pointer hover:bg-gray-100 hover:border-primary/30 transition-all overflow-hidden shadow-sm">
              {formData.logo_data ? (
                <div className="relative w-full h-full flex items-center justify-center bg-white p-4">
                  <img src={formData.logo_data} className="max-h-full object-contain" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Upload className="w-8 h-8 text-white" />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-black/5">
                    <Upload className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-center px-4">
                    <p className="text-[10px] font-black uppercase tracking-widest mb-1">Cargar Logo</p>
                    <p className="text-[9px] text-black/30 uppercase font-bold">Transparente recomendado</p>
                  </div>
                </div>
              )}
              <input type="file" className="hidden" accept="image/*" onChange={e => {
                const file = e.target.files?.[0];
                if (file) {
                  if (file.size > 5 * 1024 * 1024) {
                    showFeedback('El logo es muy pesado. Usa uno menor a 5MB', 'error');
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                      const canvas = document.createElement('canvas');
                      let width = img.width;
                      let height = img.height;
                      const MAX_SIZE = 800; // Logo doesn't need to be huge
                      if (width > height) {
                        if (width > MAX_SIZE) {
                          height *= MAX_SIZE / width;
                          width = MAX_SIZE;
                        }
                      } else {
                        if (height > MAX_SIZE) {
                          width *= MAX_SIZE / height;
                          height = MAX_SIZE;
                        }
                      }
                      canvas.width = width;
                      canvas.height = height;
                      const ctx = canvas.getContext('2d');
                      ctx?.drawImage(img, 0, 0, width, height);
                      const compressed = canvas.toDataURL('image/png', 0.8);
                      setFormData({ ...formData, logo_data: compressed });
                    };
                    img.src = event.target?.result as string;
                  };
                  reader.readAsDataURL(file);
                }
              }} />
            </label>
          </div>

          {/* Business Info */}
          <div className="space-y-4 pt-2">
             <div className="space-y-2">
              <label className="text-[11px] uppercase text-black/50 tracking-[0.1em] font-black flex items-center gap-2">
                <Store className="w-3.5 h-3.5" /> Identidad
              </label>
              <div className="relative">
                <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                <input 
                  required 
                  placeholder="Nombre de tu Negocio" 
                  className="w-full bg-gray-50 border border-black/5 rounded-2xl pl-12 pr-4 py-4 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none" 
                  value={formData.nombre_negocio} 
                  onChange={e => setFormData({...formData, nombre_negocio: e.target.value})} 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] uppercase text-black/50 tracking-[0.1em] font-black flex items-center gap-2">
                <Home className="w-3.5 h-3.5" /> Página Web (Opcional)
              </label>
              <div className="relative">
                <Home className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                <input 
                  type="url"
                  placeholder="https://www.tuweb.com" 
                  className="w-full bg-gray-50 border border-black/5 rounded-2xl pl-12 pr-4 py-4 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none" 
                  value={formData.website || ''} 
                  onChange={e => setFormData({...formData, website: e.target.value})} 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] uppercase text-black/50 tracking-[0.1em] font-black flex items-center gap-2">
                <LayoutGrid className="w-3.5 h-3.5" /> Categoría
              </label>
              <div className="relative">
                <LayoutGrid className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                <input 
                  list="marketplace-categories"
                  required 
                  placeholder="Ej: Restaurante, Barbería, Spa..." 
                  className="w-full bg-gray-50 border border-black/5 rounded-2xl pl-12 pr-4 py-4 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none" 
                  value={formData.categoria} 
                  onChange={e => setFormData({...formData, categoria: e.target.value})} 
                />
                <datalist id="marketplace-categories">
                  {existingCategories.map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] uppercase text-black/50 tracking-[0.1em] font-black flex items-center gap-2">
                <Tag className="w-3.5 h-3.5" /> Promoción
              </label>
              <div className="relative">
                <Zap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                <input 
                  required 
                  placeholder="Ej: 50% DE DESCUENTO" 
                  className="w-full bg-gray-50 border border-black/5 rounded-2xl pl-12 pr-4 py-4 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none" 
                  value={formData.oferta_principal} 
                  onChange={e => setFormData({...formData, oferta_principal: e.target.value})} 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] uppercase text-black/50 tracking-[0.1em] font-black flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5" /> Condiciones
              </label>
              <textarea 
                required 
                rows={4} 
                placeholder="Escribe las condiciones (una por línea)..." 
                className="w-full bg-gray-50 border border-black/5 rounded-2xl p-4 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-none leading-relaxed" 
                value={formData.detalles_adicionales} 
                onChange={e => setFormData({...formData, detalles_adicionales: e.target.value})} 
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] uppercase text-black/50 tracking-[0.1em] font-black flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" /> Período de Validez
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <input 
                    type="date" 
                    className="w-full bg-gray-50 border border-black/5 rounded-2xl p-4 text-[10px] font-bold outline-none focus:bg-white transition-all uppercase" 
                    value={formData.fecha_inicio} 
                    onChange={e => setFormData({...formData, fecha_inicio: e.target.value})} 
                  />
                </div>
                <div className="relative">
                  <input 
                    type="date" 
                    className="w-full bg-gray-50 border border-black/5 rounded-2xl p-4 text-[10px] font-bold outline-none focus:bg-white transition-all uppercase" 
                    value={formData.fecha_fin} 
                    onChange={e => setFormData({...formData, fecha_fin: e.target.value})} 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <button 
          disabled={loading} 
          className="w-full bg-black text-white py-5 rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-4 hover:bg-primary shadow-xl hover:shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
        >
          {loading ? <RefreshCw className="animate-spin w-5 h-5" /> : <Zap className="w-5 h-5 fill-current" />} 
          GENERAR AHORA
        </button>
      </form>
    </section>
    </div>
  );

  const renderSidebar = () => {
    if (!currentUser) return null;

    const navItemClasses = (view: AppView) => `w-full flex items-center gap-4 px-6 py-5 rounded-[24px] text-[11px] font-black uppercase tracking-widest transition-all ${activeView === view ? 'bg-secondary text-white shadow-xl shadow-secondary/20 scale-105' : 'text-black/40 hover:bg-black/5'}`;

    return (
      <>
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1050]"
            />
          )}
        </AnimatePresence>

        <aside className={`fixed inset-y-0 left-0 z-[1100] bg-white border-r border-black/5 flex flex-col shrink-0 w-80 h-full transition-all duration-500 transform ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'} overflow-hidden`}>
          <div className="flex flex-col h-full bg-white relative">
            <div className="p-8 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-white rounded-xl overflow-hidden p-1 shadow-sm border border-black/5">
                   <img src="https://cossma.com.mx/cuponmania.png" className="w-full h-full object-contain" alt="Logo" />
                 </div>
                 <span className="text-xl font-black tracking-tighter">CUPONMANÍA</span>
              </div>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="lg:hidden p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 p-6 space-y-3 overflow-y-auto">
              <div className="text-[10px] font-black tracking-[0.2em] text-black/20 ml-2 mb-4 uppercase">NAVEGACIÓN</div>
              
              <button onClick={() => setActiveView('marketplace')} className={navItemClasses('marketplace')}>
                 <Store className="w-5 h-5" /> <span>Cuponmanía</span>
              </button>
              
              <button onClick={() => setActiveView('wallet')} className={navItemClasses('wallet')}>
                 <Ticket className="w-5 h-5" /> <span>{currentRole === 'patrocinador' ? 'Mis Cupones' : 'Mi Cuponera'}</span>
              </button>

              {(currentUser?.role === 'admin' || currentUser?.role === 'patrocinador') && (
                <>
                  {(currentUser?.role === 'patrocinador' || currentUser?.role === 'admin') && (
                    <button onClick={() => setActiveView('generator')} className={navItemClasses('generator')}>
                      <Sparkles className="w-5 h-5" /> <span>Generador</span>
                    </button>
                  )}
                  <button onClick={() => setActiveView('coupon_counter')} className={navItemClasses('coupon_counter')}>
                    <QrCode className="w-5 h-5" /> <span>Contador</span>
                  </button>
                </>
              )}

              <div className="h-px bg-black/5 my-6 mx-2" />
              <div className="text-[10px] font-black tracking-[0.2em] text-black/20 ml-2 mb-4 uppercase">CUENTA</div>
              
              <button onClick={() => setActiveView('profile')} className={navItemClasses('profile')}>
                 <User className="w-5 h-5" /> <span>Mi Perfil</span>
              </button>

              <button onClick={() => setActiveView('notifications')} className={navItemClasses('notifications')}>
                 <div className="relative">
                   <Bell className="w-5 h-5" />
                   {unreadCount > 0 && <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />}
                 </div>
                 <span>Notificaciones</span>
              </button>

              {currentRole === 'admin' && (
                <>
                  <div className="h-px bg-black/5 my-6 mx-2" />
                  <div className="text-[10px] font-black tracking-[0.2em] text-black/20 ml-2 mb-4 uppercase">ADMINISTRACIÓN</div>
                  
                  <button onClick={() => setActiveView('admin_dashboard')} className={navItemClasses('admin_dashboard')}>
                     <LayoutDashboard className="w-5 h-5" /> <span>Métricas Globales</span>
                  </button>
                  <button onClick={() => setActiveView('admin_users')} className={navItemClasses('admin_users')}>
                     <User className="w-5 h-5" /> <span>Usuarios</span>
                  </button>
                  <button onClick={() => setActiveView('admin_flyer')} className={navItemClasses('admin_flyer')}>
                     <Palette className="w-5 h-5" /> <span>Flyers Publi</span>
                  </button>
                </>
              )}

              <div className="pt-10 space-y-3">
                {deferredPrompt && !isAppInstalled && (
                  <button 
                    onClick={handleInstall}
                    className="w-full flex items-center gap-4 px-6 py-5 rounded-[24px] text-[11px] font-black uppercase tracking-widest bg-orange-500 text-white shadow-xl shadow-orange-500/20 hover:bg-orange-600 transition-all scale-100 hover:scale-105"
                  >
                    <Download className="w-5 h-5" /> <span>Instalar App</span>
                  </button>
                )}

                <button onClick={handleLogout} className="w-full flex items-center gap-4 px-6 py-5 rounded-[24px] text-[11px] font-black uppercase tracking-widest text-red-500/40 hover:text-red-500 hover:bg-red-50 transition-all">
                   <RefreshCw className="w-5 h-5" /> <span>Cerrar Sesión</span>
                </button>
              </div>
            </nav>
          </div>
        </aside>
      </>
    );
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('¿Estás seguro? Se borrarán todos sus cupones también.')) return;
    try {
      const supabase = getSupabase();
      // Borrar cupones primero
      await supabase.from('coupons').delete().eq('creator_id', id);
      
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setUsers(prev => prev.filter(u => u.id !== id));
      showFeedback('Usuario y sus cupones eliminados');
      fetchCoupons();
    } catch (err) {
      console.error(err);
      showFeedback('Error al eliminar usuario');
    }
  };

  const handleToggleUserStatus = async (id: string) => {
    try {
      const user = users.find(u => u.id === id);
      if (!user) return;
      
      const supabase = getSupabase();
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !user.isActive })
        .eq('id', id);
      
      if (error) throw error;
      showFeedback(`Usuario ${!user.isActive ? 'activado' : 'desactivado'}`);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, isActive: !u.isActive } : u));
    } catch (err) {
      console.error(err);
      showFeedback('Error al actualizar estado del usuario');
    }
  };

  const renderMainContent = () => {
    switch (activeView) {
      case 'notifications':
        return (
          <section className="flex-1 bg-gray-50 p-6 md:p-12 pb-32">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">Notificaciones</h2>
                  <p className="text-xs text-black/40 font-bold uppercase tracking-widest">
                    {unreadCount > 0 ? `Tienes ${unreadCount} avisos sin leer` : 'Estás al día con tus novedades'}
                  </p>
                </div>
                {notifications.length > 0 && (
                  <button 
                    onClick={clearAllNotifications}
                    className="flex items-center gap-2 text-red-500 hover:text-red-600 transition-colors bg-red-50 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest"
                  >
                    <Trash2 className="w-4 h-4" /> Vaciado rápido
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="bg-white rounded-[40px] p-20 flex flex-col items-center justify-center text-center shadow-sm border border-black/5">
                  <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-8">
                    <Bell className="w-12 h-12 text-black/10" />
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-tight mb-2">Silencio total</h3>
                  <p className="text-sm text-black/40 font-bold uppercase tracking-widest">No hay notificaciones nuevas por aquí</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notifications.map(n => (
                    <div 
                      key={n.id}
                      onClick={() => markNotificationAsRead(n.id)}
                      className={`group relative bg-white p-6 rounded-[32px] border transition-all cursor-pointer ${!n.is_read ? 'border-primary shadow-xl shadow-primary/5' : 'border-black/5 shadow-sm opacity-70 hover:opacity-100'}`}
                    >
                      <div className="flex items-start gap-4 pr-12">
                        <div className={`mt-1 p-2 rounded-xl ${n.type === 'success' ? 'bg-green-50 text-green-500' : 'bg-blue-50 text-blue-500'}`}>
                          {n.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-black uppercase tracking-tight">{n.title}</h4>
                            {!n.is_read && <span className="w-2 h-2 bg-primary rounded-full" />}
                          </div>
                          <p className="text-xs text-black/60 font-bold leading-relaxed mb-2">{n.message}</p>
                          <span className="text-[9px] text-black/30 font-black uppercase tracking-widest">
                            {new Date(n.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                        className="absolute top-6 right-6 p-2 text-black/10 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all md:opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        );
      case 'marketplace': return <MarketplaceView coupons={activeCoupons} savedIds={savedIds} likedIds={likedIds} onSave={handleSaveCoupon} onLike={handleLikeCoupon} onShowFlyer={() => setIsFlyerFullscreen(true)} flyerLink={flyerLinks.flyer1} users={users} onShowSponsor={(s) => setViewingSponsor(s)} isLoading={isFetchingCoupons} isAdmin={currentRole === 'admin'} onDelete={handleDeleteCoupon} />;
      case 'coupon_counter': return <CouponCounterView currentUser={currentUser!} coupons={activeCoupons} showFeedback={showFeedback} />;
      case 'wallet': 
        return currentUser?.role === 'patrocinador' 
          ? <SponsorDashboard coupons={activeCoupons} onTogglePublish={togglePublishStatus} onDelete={handleDeleteCoupon} /> 
          : <WalletView coupons={activeCoupons} savedIds={savedIds} likedIds={likedIds} onSave={handleSaveCoupon} onLike={handleLikeCoupon} users={users} onShowSponsor={(s) => setViewingSponsor(s)} />;
      case 'profile': 
        return currentUser ? (
          <ProfileView user={currentUser} onUpdate={(updated) => {
            setCurrentUser(updated);
            upsertProfile(updated);
            setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
            showFeedback('Perfil actualizado correctamente');
          }} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-12 text-center">
            <User className="w-16 h-16 text-black/10 mb-6" />
            <h3 className="text-xl font-black uppercase tracking-tight mb-4">Inicia Sesión</h3>
            <p className="text-sm text-black/40 font-bold uppercase tracking-widest mb-8">Debes ingresar para ver y editar tu perfil</p>
            <button onClick={() => setIsAuthModalOpen(true)} className="bg-black text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-primary transition-all active:scale-95">Ingresar Ahora</button>
          </div>
        );
      case 'generator':
        return (
          <div className="flex flex-col items-center justify-start relative w-full">
            <div className="w-full max-w-5xl flex flex-col items-center md:items-start md:flex-row gap-12 transform transition-transform duration-500 origin-top pt-4 pb-20">
              <div className="w-full md:w-[450px] shrink-0">
                <div className="bg-white rounded-[32px] shadow-xl overflow-hidden border border-black/5">
                  {renderGeneratorForm()}
                </div>
              </div>
              
              <div className="flex-1 flex flex-col items-center justify-center lg:sticky top-4 min-h-[600px]">
                <AnimatePresence mode="wait">
                  {!coupon ? (
                    <div className="text-center max-sm:px-6 opacity-20 py-20">
                      <Zap className="w-20 h-20 mx-auto mb-6" />
                      <p className="font-bold uppercase tracking-widest text-sm">Completa el formulario para visualizar tu diseño</p>
                    </div>
                  ) : (
                    <CouponPreview 
                      key="active-coupon-preview"
                      config={coupon} 
                      logo={currentUser?.role === 'patrocinador' ? currentUser.photo : formData.logo_data || null}
                      onReset={() => setCoupon(null)}
                      onPublish={(img) => publishCoupon(true, img)}
                      onSaveDraft={(img) => publishCoupon(false, img)}
                      showFeedback={showFeedback}
                      sponsor={currentUser}
                    />
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        );
      case 'admin_dashboard':
        return (
          <div className="p-8 md:p-12">
            <h2 className="text-3xl font-black uppercase tracking-tighter mb-8">Panel de Control</h2>
            <AdminMetricsView metrics={adminMetrics} />
            <div className="mt-12">
              <h3 className="text-xl font-black uppercase tracking-tight mb-6">Actividad Reciente</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-[32px] border border-black/5">
                  <p className="text-[10px] font-black uppercase text-black/40 tracking-widest mb-4">Últimos Cupones</p>
                  <div className="space-y-4">
                    {activeCoupons.slice(0, 5).map(c => (
                      <div key={c.id} className="flex items-center justify-between py-3 border-b border-black/5 group">
                        <div className="flex flex-col">
                          <span className="text-xs font-black uppercase">{c.data.header.nombre_negocio}</span>
                          <span className="text-[8px] font-black uppercase text-black/20 tracking-widest">{new Date(c.publishedAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[9px] font-black uppercase text-primary bg-primary/10 px-2 py-1 rounded-full">{c.data.oferta.texto}</span>
                          <button 
                            onClick={() => {
                              if (window.confirm('¿ELIMINAR CUPÓN DEFINITIVAMENTE?')) handleDeleteCoupon(c.id);
                            }}
                            className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white p-8 rounded-[32px] border border-black/5">
                  <p className="text-[10px] font-black uppercase text-black/40 tracking-widest mb-4">Usuarios Recientes</p>
                  <div className="space-y-4">
                    {users.slice(-5).reverse().map(u => (
                      <div key={u.id} className="flex items-center justify-between py-2 border-b border-black/5">
                        <span className="text-xs font-black uppercase">{u.username}</span>
                        <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${u.role === 'patrocinador' ? 'text-orange-600 bg-orange-50' : 'text-blue-600 bg-blue-50'}`}>{u.role}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'admin_users':
        return (
          <div className="p-8 md:p-12">
            <AdminUsersList 
              users={users} 
              onToggleStatus={(id) => {
                setUsers(prev => prev.map(u => u.id === id ? { ...u, isActive: !u.isActive } : u));
                handleToggleUserStatus(id);
              }} 
              onManageFlyer={() => setActiveView('admin_flyer')}
              onDeleteUser={handleDeleteUser}
            />
          </div>
        );
      case 'admin_flyer':
        return <AdminFlyerView initialLinks={flyerLinks} onUpdate={updateFlyerSettings} />;
      case 'admin_notifications':
        return <AdminNotificationCenter showFeedback={showFeedback} />;
    }
  };

  if (!currentUser && activeView !== 'marketplace') {
    return <AuthView 
      upsertProfile={upsertProfile}
      onAuth={(userProfile) => {
        setCurrentUser(userProfile);
        setCurrentRole(userProfile.role);
        setIsAuthModalOpen(false);
        fetchProfiles(); // Sincronizar lista de usuarios inmediatamente
        if (userProfile.role === 'admin') setActiveView('admin_dashboard');
        else if (userProfile.role === 'patrocinador') setActiveView('generator');
        else setActiveView('marketplace');
        showFeedback(`Bienvenido, ${userProfile.name}`);
      }} 
      users={users} 
    />;
  }

  return (
    <div className="h-screen bg-white text-black font-sans flex flex-col antialiased overflow-hidden">
      
      <AnimatePresence>
        {/* activeAlert removed by user request */}
      </AnimatePresence>

      {/* Toast Feedback */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${toast.type === 'success' ? 'bg-black text-white border-white/10' : 'bg-red-500 text-white border-red-400'}`}
          >
            {toast.type === 'success' ? <Check className="w-4 h-4 text-primary" /> : <X className="w-4 h-4" />}
            <span className="text-[10px] font-black uppercase tracking-widest">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auth Modal for Guests */}
      <AnimatePresence>
        {isFlyerFullscreen && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/95 backdrop-blur-3xl px-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-6xl flex items-center justify-center"
            >
              <img 
                src={flyerLinks.flyer2} 
                className="w-full h-auto max-h-[90vh] object-contain shadow-[0_0_100px_rgba(0,0,0,0.5)] rounded-2xl"
                alt="Flyer Detalle"
              />
              <button 
                onClick={() => setIsFlyerFullscreen(false)}
                className="absolute -top-12 sm:top-4 -right-2 sm:right-4 w-12 h-12 md:w-16 md:h-16 bg-red-600 hover:bg-red-700 shadow-2xl rounded-2xl flex items-center justify-center text-white transition-all z-[2100] active:scale-90"
                title="Cerrar"
              >
                <X className="w-6 h-6 md:w-8 md:h-8" />
              </button>
            </motion.div>
          </div>
        )}
        {isAuthModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[40px] shadow-2xl"
            >
              <AuthView 
                upsertProfile={upsertProfile}
                onAuth={(userProfile) => {
                  setCurrentUser(userProfile);
                  setCurrentRole(userProfile.role);
                  setIsAuthModalOpen(false);
                  showFeedback(`Bienvenido, ${userProfile.name}`);
                }} 
                users={users} 
                onBack={() => setIsAuthModalOpen(false)}
              />
              <button 
                onClick={() => setIsAuthModalOpen(false)}
                className="absolute top-8 right-8 text-black/20 hover:text-red-500 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className={`h-16 md:h-24 border-b border-black/5 flex items-center justify-between px-4 md:px-10 bg-secondary shrink-0 z-[950] text-white shadow-xl fixed top-0 left-0 w-full transition-all duration-500 ${isSidebarOpen ? 'lg:pl-80' : 'pl-0'}`}>
        <div className="flex items-center gap-3 md:gap-8">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-3 text-white hover:bg-white/10 rounded-2xl transition-all flex items-center justify-center border border-white/10"
          >
            {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          
          <div className="h-14 md:h-24 flex items-center py-2">
            <img src="https://cossma.com.mx/cuponmania.png" alt="Cuponmanía" className="h-full w-auto object-contain" />
          </div>
        </div>

        <div className="flex items-center gap-4">
          {currentUser && (
            <div className="flex flex-col items-end hidden sm:flex text-right">
              {currentUser.role === 'patrocinador' ? (
                <>
                  <span className="text-[11px] font-black uppercase tracking-widest">{currentUser.businessName}</span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-white/50">{currentUser.representativeName}</span>
                </>
              ) : currentUser.role === 'usuario' ? (
                <>
                  <span className="text-[11px] font-black uppercase tracking-widest">@{currentUser.username}</span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-white/50">{currentUser.name}</span>
                </>
              ) : (
                <>
                  <span className="text-[11px] font-black uppercase tracking-widest">{currentUser.name}</span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-white/50">{currentUser.role}</span>
                </>
              )}
            </div>
          )}
          <button 
            onClick={() => currentUser ? setActiveView('profile') : setIsAuthModalOpen(true)}
            className={`w-10 h-10 md:w-14 md:h-14 rounded-2xl border-2 transition-all flex items-center justify-center overflow-hidden bg-white/10 ${activeView === 'profile' ? 'border-primary ring-4 ring-primary/20 shadow-lg' : 'border-white/10 hover:border-white/30'}`}
          >
            {currentUser?.photo ? (
              <img src={currentUser.photo} className="w-full h-full object-cover" />
            ) : (
              <User className="w-6 h-6 text-white" />
            )}
          </button>
        </div>
      </header>

      <main className="flex-1 relative w-full h-full overflow-y-auto pt-16 md:pt-24" id="root-scroll-area">
        {renderSidebar()}
        <section className={`transition-all duration-500 ${isSidebarOpen ? 'lg:pl-80' : 'pl-0'} pb-24 md:pb-0 relative w-full min-h-full flex flex-col`}>
          <div className="flex-1">
            {renderMainContent()}
          </div>
        </section>

      </main>
      
      {/* Mobile Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-secondary border-t border-white/10 flex items-center justify-around px-2 z-[1000] shadow-[0_-10px_40px_rgba(0,0,0,0.3)] text-white">
        {currentUser?.role === 'admin' && (
          <button onClick={() => setActiveView('admin_dashboard')} className={`flex flex-col items-center gap-1 transition-all ${activeView === 'admin_dashboard' ? 'text-white scale-110' : 'text-white/40'}`}>
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[7px] font-black uppercase">Admin</span>
          </button>
        )}
        {(currentUser?.role === 'admin' || currentUser?.role === 'patrocinador') && (
          <button onClick={() => { setActiveView('generator'); setCoupon(null); }} className={`flex flex-col items-center gap-1 transition-all ${activeView === 'generator' ? 'text-white scale-110' : 'text-white/40'}`}>
            <Ticket className="w-5 h-5" />
            <span className="text-[7px] font-black uppercase">Crear</span>
          </button>
        )}
        <button onClick={() => setActiveView('marketplace')} className={`flex flex-col items-center gap-1 transition-all ${activeView === 'marketplace' ? 'text-white scale-110' : 'text-white/40'}`}>
          <Store className="w-5 h-5" />
          <span className="text-[7px] font-black uppercase">Cupones</span>
        </button>
        <button onClick={() => setActiveView('notifications')} className={`flex flex-col items-center gap-1 transition-all ${activeView === 'notifications' ? 'text-white scale-110' : 'text-white/40'}`}>
          <div className="relative">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-secondary" />}
          </div>
          <span className="text-[7px] font-black uppercase">Avisos</span>
        </button>
        {(currentUser?.role === 'admin' || currentUser?.role === 'patrocinador') && (
          <button onClick={() => setActiveView('coupon_counter')} className={`flex flex-col items-center gap-1 transition-all ${activeView === 'coupon_counter' ? 'text-white scale-110' : 'text-white/40'}`}>
            <QrCode className="w-5 h-5" />
            <span className="text-[7px] font-black uppercase">Contador</span>
          </button>
        )}
        <button onClick={() => setActiveView('profile')} className={`flex flex-col items-center gap-1 transition-all ${activeView === 'profile' ? 'text-white scale-110' : 'text-white/40'}`}>
          <User className="w-5 h-5" />
          <span className="text-[7px] font-black uppercase">Perfil</span>
        </button>
        {currentUser && (
          <button onClick={handleLogout} className="flex flex-col items-center gap-1 text-red-400">
            <RefreshCw className="w-5 h-5" />
            <span className="text-[7px] font-black uppercase">Salir</span>
          </button>
        )}
      </nav>

      <AnimatePresence>
        {/* showInstallPrompt removed to avoid floating orange button as requested */}
      </AnimatePresence>

      <SponsorModal 
        sponsor={viewingSponsor || ({} as UserProfile)} 
        isOpen={!!viewingSponsor} 
        onClose={() => setViewingSponsor(null)} 
      />
    </div>
  );
}
