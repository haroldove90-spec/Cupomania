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
  Megaphone,
  Clock, 
  RefreshCw, 
  Copy, 
  Check, 
  ArrowRight,
  ArrowLeft,
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
  Calendar,
  LayoutGrid,
  Heart,
  Search,
  Settings,
  Shield,
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
  ZoomIn,
  ZoomOut,
  RotateCw,
  Share2,
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
  Globe,
  Bookmark,
  HelpCircle,
  Filter,
  ChevronDown,
  Smartphone
} from 'lucide-react';
import { generateCoupon } from './services/geminiService';
import { BusinessData, CuponConfig, UserRole, AppView, UserProfile, AdminMetrics, AppNotification, CouponRedemption, IzcalliFlyer } from './types';
import { getSupabase } from './lib/supabase';
import EnlaceIzcalliView from './components/EnlaceIzcalliView';

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
    { title: 'Visitas Totales', value: metrics.pageVisits.toLocaleString(), icon: Eye, color: 'text-gray-600', bg: 'bg-gray-50' },
    { title: 'Ingresos Totales', value: `$${metrics.totalRevenue.toLocaleString()}`, icon: CreditCard, color: 'text-green-600', bg: 'bg-green-50' },
    { title: 'Usuarios', value: metrics.totalUsers, icon: User, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Patrocinadores', value: metrics.totalSponsors, icon: Briefcase, color: 'text-orange-600', bg: 'bg-orange-50' },
    { title: 'Administradores', value: metrics.totalAdmins, icon: Shield, color: 'text-red-600', bg: 'bg-red-50' },
    { title: 'Cupones Creados', value: metrics.totalCoupons, icon: Ticket, color: 'text-purple-600', bg: 'bg-purple-50' },
    { title: 'Flyers (Patrocinadores)', value: metrics.totalFlyers || 0, icon: Megaphone, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { title: 'Activos Hoy', value: metrics.dailyActiveUsers, icon: Zap, color: 'text-yellow-600', bg: 'bg-yellow-50' },
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

const BusinessRegistrationView = ({ onAuth, users, upsertProfile, onBack }: { 
  onAuth: (user: UserProfile) => void; 
  users: UserProfile[]; 
  upsertProfile: (user: UserProfile, isRegistration?: boolean) => Promise<UserProfile | null>; 
  onBack: () => void;
}) => {
  return (
    <div className="w-full flex-1 bg-white">
      <AuthView 
        initialRole="patrocinador"
        initialIsRegister={true}
        onAuth={onAuth}
        users={users}
        upsertProfile={upsertProfile}
        onBack={onBack}
      />
    </div>
  );
};

const BusinessRegistrationForm = ({ onSubmit, loading, error, onShowPrivacy }: { 
  onSubmit: (formData: any) => void;
  loading: boolean;
  error: string;
  onShowPrivacy?: () => void;
}) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    representativeName: '',
    address: '',
    locationLink: '',
    website: '',
    whatsapp: '',
    email: '',
    services: [] as string[],
    photo: null as string | null,
    acceptPrivacy: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [newService, setNewService] = useState('');

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData(p => ({ ...p, photo: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const internalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={internalSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
           <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-black/40 ml-4 tracking-widest">Nombre de Usuario</label>
            <input required type="text" className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xs font-bold outline-none ring-2 ring-transparent focus:ring-secondary/20 transition-all" value={formData.username} onChange={e => setFormData(p => ({ ...p, username: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-black/40 ml-4 tracking-widest">Contraseña</label>
            <div className="relative">
              <input required type={showPassword ? "text" : "password"} className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xs font-bold outline-none" value={formData.password} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-black/20">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-black/40 ml-4 tracking-widest">Confirmar Contraseña</label>
            <input required type={showPassword ? "text" : "password"} className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xs font-bold outline-none" value={formData.confirmPassword} onChange={e => setFormData(p => ({ ...p, confirmPassword: e.target.value }))} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-black/40 ml-4 tracking-widest">Logo del Negocio</label>
            <label className="w-full flex items-center justify-center p-4 bg-gray-50 rounded-2xl cursor-pointer border-2 border-dashed border-black/5 hover:border-secondary/20 transition-all">
              {formData.photo ? <img src={formData.photo} className="h-12 object-contain" /> : <div className="flex flex-col items-center gap-1 text-black/20"><Camera className="w-5 h-5"/> <span className="text-[8px] font-black uppercase">Subir Logo</span></div>}
              <input type="file" className="hidden" accept="image/*" onChange={handlePhotoChange} />
            </label>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-black/40 ml-4 tracking-widest">Nombre del Negocio</label>
            <input required type="text" className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xs font-bold outline-none" value={formData.businessName} onChange={e => setFormData(p => ({ ...p, businessName: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-black/40 ml-4 tracking-widest">Representante</label>
            <input required type="text" className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xs font-bold outline-none" value={formData.representativeName} onChange={e => setFormData(p => ({ ...p, representativeName: e.target.value }))} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-black/5">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-black/40 ml-4 tracking-widest">WhatsApp</label>
            <input required type="text" className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xs font-bold outline-none" value={formData.whatsapp} onChange={e => setFormData(p => ({ ...p, whatsapp: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-black/40 ml-4 tracking-widest">Email</label>
            <input required type="email" className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xs font-bold outline-none" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} />
          </div>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-black/40 ml-4 tracking-widest">Ubicación (Maps)</label>
            <input required type="url" placeholder="Link de Google Maps" className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xs font-bold outline-none" value={formData.locationLink} onChange={e => setFormData(p => ({ ...p, locationLink: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-black/40 ml-4 tracking-widest">Dirección</label>
            <input required type="text" className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xs font-bold outline-none" value={formData.address} onChange={e => setFormData(p => ({ ...p, address: e.target.value }))} />
          </div>
        </div>
      </div>

      <div className="space-y-2 pt-4 border-t border-black/5">
        <label className="text-[10px] font-black uppercase text-black/40 ml-4 tracking-widest">Servicios</label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input type="text" placeholder="Ej: Barbería" className="w-full sm:flex-1 bg-gray-50 border-none rounded-2xl p-4 text-xs font-bold outline-none" value={newService} onChange={e => setNewService(e.target.value)} onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); if(newService.trim()) { setFormData(p => ({ ...p, services: [...p.services, newService.trim()] })); setNewService(''); } } }} />
          <button type="button" onClick={() => { if(newService.trim()) { setFormData(p => ({ ...p, services: [...p.services, newService.trim()] })); setNewService(''); } }} className="w-full sm:w-auto bg-secondary text-white px-8 py-4 sm:py-0 rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-secondary/20 active:scale-95 transition-all">Añadir</button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {formData.services.map((s, i) => (
            <span key={i} className="bg-secondary/10 text-secondary px-3 py-1.5 rounded-xl text-[9px] font-black uppercase flex items-center gap-2">
              {s}
              <button type="button" onClick={() => setFormData(p => ({ ...p, services: p.services.filter((_, idx) => idx !== i) }))} className="text-red-500 hover:scale-110"><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-2xl mt-6">
        <input 
          type="checkbox" 
          id="privacy-business" 
          checked={formData.acceptPrivacy} 
          onChange={e => setFormData(p => ({ ...p, acceptPrivacy: e.target.checked }))}
          className="mt-1 w-4 h-4 rounded border-gray-300 text-secondary focus:ring-secondary"
        />
        <label htmlFor="privacy-business" className="text-[10px] font-bold text-black/60 leading-snug">
          He leído y acepto el <button type="button" onClick={onShowPrivacy} className="text-secondary font-black hover:underline">Aviso de Privacidad</button>. Entiendo que mis datos comerciales serán públicos.
        </label>
      </div>

      {error && <p className="text-red-500 text-center text-[10px] font-black uppercase bg-red-50 p-4 rounded-2xl">{error}</p>}

      <button disabled={loading || !formData.acceptPrivacy} type="submit" className="w-full bg-black text-white py-6 rounded-[28px] text-[11px] font-black uppercase tracking-widest shadow-2xl shadow-black/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">
        {loading ? 'Procesando Registro...' : 'Registrar mi Negocio Ahora'}
      </button>
    </form>
  );
};

const LandingPageView = ({ onJoin, onExplore, registrationForm, onShowPrivacy }: { onJoin: () => void; onExplore: () => void; registrationForm: React.ReactNode; onShowPrivacy: () => void }) => {
  return (
    <div className="w-full flex flex-col overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative w-full min-h-screen flex flex-col items-center pt-8 md:pt-12 pb-8 px-6 overflow-hidden bg-white">
        {/* Abstract shapes/blobs */}
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -z-10 animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[100px] -z-10" />

        <div className="max-w-[1200px] w-full flex flex-col items-center text-center gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col gap-4"
          >
            <div className="inline-flex px-6 py-2 bg-secondary text-white rounded-full mx-auto shadow-lg shadow-secondary/20 whitespace-nowrap">
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">¡Lanzamiento Mayo 2026!</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl xl:text-8xl font-black tracking-tighter leading-[0.95] uppercase max-w-4xl">
              Haz que todo <span className="text-primary italic">Izcalli y Tlalne</span> conozcan tu negocio.
            </h1>
            
            <p className="text-base md:text-xl font-bold text-black/40 uppercase tracking-tight leading-snug max-w-2xl mx-auto">
              Únete a la red de cupones más grande de la zona. <span className="text-black font-black">Registro GRATIS por lanzamiento (Todo Mayo).</span>
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 mt-2 justify-center">
              <button 
                onClick={() => document.getElementById('registro-seccion')?.scrollIntoView({ behavior: 'smooth' })}
                className="group w-full sm:w-auto px-10 py-6 bg-primary text-white rounded-[28px] text-[11px] font-black uppercase tracking-widest shadow-2xl shadow-primary/30 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-4"
              >
                <Store className="w-5 h-5" />
                Registrar mi Negocio
              </button>
              <button 
                onClick={onExplore}
                className="group w-full sm:w-auto px-10 py-6 bg-white text-black border-4 border-black/5 rounded-[28px] text-[11px] font-black uppercase tracking-widest transition-all hover:bg-black/5 flex items-center justify-center gap-4"
              >
                <Ticket className="w-5 h-5 text-secondary" />
                Explorar Cupones
              </button>
            </div>
          </motion.div>

          {/* Image specifically placed below the title/buttons as requested */}
          <motion.div 
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative w-full max-w-4xl mt-4"
          >
            <div className="absolute inset-0 bg-primary/20 rounded-[64px] blur-[80px] -z-10" />
            
            <div className="relative">
               <img 
                 src="https://cossma.com.mx/cuponmaniaflyer2.png" 
                 className="w-full h-auto" 
                 alt="Promoción Cuponmanía" 
               />
            </div>
            
            {/* Floating badges - Restored backgrounds as requested, now more discrete */}
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute -top-4 -right-4 md:-top-6 md:-right-6 bg-white p-3 md:p-4 rounded-[20px] md:rounded-[24px] shadow-xl border border-black/5 max-w-[110px] md:max-w-[150px] z-20"
            >
               <div className="flex items-center gap-2 mb-1 text-left">
                 <div className="p-1 md:p-1.5 bg-green-500 rounded-lg shrink-0 shadow-md">
                    <Zap className="w-2.5 h-2.5 md:w-3 md:h-3 text-white" />
                 </div>
                 <span className="text-[7px] md:text-[9px] font-black uppercase leading-tight text-black">Ventas hoy</span>
               </div>
               <div className="text-lg md:text-2xl font-black text-left text-black">+14k</div>
            </motion.div>

            <motion.div 
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 5, repeat: Infinity, delay: 0.5 }}
              className="absolute -bottom-4 -left-4 md:-bottom-6 md:-left-6 bg-black p-3 md:p-4 rounded-[20px] md:rounded-[24px] shadow-xl max-w-[110px] md:max-w-[150px] z-20"
            >
               <p className="text-[6px] md:text-[8px] font-black uppercase text-white/50 tracking-widest mb-1 leading-tight text-left">Negocios Locales</p>
               <div className="text-base md:text-xl font-black text-white text-left">100% LOCAL</div>
            </motion.div>
          </motion.div>

          <div className="flex items-center justify-center mt-4 gap-4">
            <img 
              src="https://cossma.com.mx/negocios.png" 
              alt="Negocios" 
              className="h-10 md:h-14 w-auto object-contain"
            />
            <p className="text-[9px] md:text-[10px] font-black uppercase text-black/40 tracking-widest max-w-[150px] leading-tight text-left">
              +100 negocios locales confían en nosotros
            </p>
          </div>

          <motion.div 
            initial={{ scale: 0.9, opacity: 0, rotate: -3 }}
            whileInView={{ scale: 1, opacity: 1, rotate: -2 }}
            whileHover={{ rotate: 0, scale: 1.02 }}
            className="mt-12 p-10 md:p-16 border-4 border-primary/30 rounded-[60px] bg-white shadow-[0_40px_100px_-20px_rgba(245,124,0,0.25)] inline-block relative cursor-default"
          >
            <div className="absolute -top-6 -right-6 bg-secondary text-white px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-2xl skew-x-[-12deg]">
              ¡Próximamente!
            </div>
            <h3 className="text-3xl md:text-5xl font-black uppercase tracking-tighter italic text-secondary leading-none mb-3">
              Lanzamiento de la cuponera
            </h3>
            <p className="text-6xl md:text-9xl font-black uppercase tracking-tighter italic text-black leading-none drop-shadow-2xl">
              Junio 2026
            </p>
            <div className="w-40 h-2 bg-primary/20 mx-auto mt-8 rounded-full" />
          </motion.div>
        </div>
      </section>

      {/* Grid of benefits */}
      <section className="bg-gray-50 py-8 px-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Zap, title: "Visibilidad Inmediata", desc: "Aparece ante miles de usuarios locales buscando ofertas." },
              { icon: Store, title: "Perfil de Negocio", desc: "Página dedicada para tu marca con logo y redes sociales." },
              { icon: Gift, title: "Cupones Dinámicos", desc: "Crea ofertas que caducan automáticamente para generar urgencia." },
            ].map((item, i) => (
              <div key={i} className="bg-white p-10 rounded-[40px] border border-black/5 shadow-sm">
                <div className="p-4 bg-primary/10 rounded-2xl w-fit mb-6 text-primary">
                  <item.icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black uppercase mb-3">{item.title}</h3>
                <p className="text-black/40 font-bold uppercase text-[11px] leading-relaxed tracking-tight">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Registration Section - THE FORM AS REQUESTED */}
      <section id="registro-seccion" className="py-16 px-6 bg-white relative">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4 italic">Crear Cuenta de Patrocinador</h2>
            <p className="text-lg font-bold text-black/40 uppercase tracking-widest">Completa tus datos para empezar a publicar cupones hoy mismo.</p>
          </div>

          <div className="bg-white p-8 md:p-12 rounded-[48px] md:rounded-[64px] shadow-[0_50px_100px_rgba(0,0,0,0.08)] border-8 border-black/5">
             {registrationForm}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-gray-50 border-t border-black/5 text-center">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-6">
          <img src="https://cossma.com.mx/cuponmania.png" alt="Cuponmanía" className="h-10 object-contain grayscale opacity-50" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40">
            Desarrollada por: <span className="text-black transition-colors hover:text-primary">App Design</span> - Todos los derechos reservados 2026
          </p>
          <div className="flex items-center gap-6">
            <button 
              onClick={onShowPrivacy}
              className="text-[9px] font-bold uppercase tracking-widest text-black/40 hover:text-secondary transition-colors"
            >
              Aviso de Privacidad
            </button>
          </div>
        </div>
      </footer>

      {/* Watermark Logo */}
      <div className="fixed bottom-6 right-6 z-[100] opacity-30 hover:opacity-100 transition-opacity pointer-events-none sm:pointer-events-auto">
        <img src="https://cossma.com.mx/cuponmania.png" className="w-12 h-12 object-contain" alt="Cuponmanía" />
      </div>
    </div>
  );
};

const AdminNotificationCenter = ({ showFeedback }: { showFeedback: (msg: string, type?: 'success' | 'error') => void }) => {
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
    if (currentUser) {
      fetchRegistrations();
    }
  }, [currentUser?.id]);

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
      
      // Intentamos borrar de ambas tablas por si acaso
      // Nota: Supabase no lanza error si no encuentra la fila, por eso ejecutamos ambas o capturamos errores reales
      const [photoRes, redRes] = await Promise.all([
        supabase.from('photo_registrations').delete().eq('id', id),
        supabase.from('coupon_redemptions').delete().eq('id', id)
      ]);

      if (photoRes.error && redRes.error) {
        throw new Error(`Error en base de datos: ${photoRes.error.message} / ${redRes.error.message}`);
      }
      
      // Actualización optimista de la UI
      setRegistrations(prev => prev.filter(r => r.id !== id));
      showFeedback('Registro eliminado con éxito', 'success');
      
      // Refrescar para sincronizar
      setTimeout(fetchRegistrations, 1000);
    } catch (err: any) {
      console.error('Error deleting registration:', err);
      showFeedback(`Error al eliminar: ${err.message || 'vuelve a intentar'}`, 'error');
    }
  };

  return (
    <div className="w-full h-full p-6 md:p-16 max-w-[1400px] mx-auto pb-32">
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-black/5 pb-8">
        <div>
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase mb-4 leading-none">REGISTRO DE CUPONES</h2>
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
                className="bg-white rounded-3xl p-4 shadow-lg border border-black/5 group hover:shadow-2xl transition-all cursor-pointer relative flex flex-col"
                onClick={() => setSelectedFullPhoto(reg.photo_url || '')}
              >
                <div className="w-full h-[200px] rounded-2xl overflow-hidden bg-black/5 mb-4 relative flex items-center justify-center">
                   {reg.photo_url ? (
                     <img 
                       src={reg.photo_url} 
                       className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-700" 
                       alt="Registro" 
                       referrerPolicy="no-referrer"
                     />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center bg-black/5">
                       <Clock className="w-10 h-10 text-black/10" />
                     </div>
                   )}
                   <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                     <Maximize2 className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity translate-y-4 group-hover:translate-y-0 duration-300" />
                   </div>
                   <div className="absolute bottom-2 left-2 right-2 text-center">
                      <div className="inline-flex px-2 py-1 bg-black/40 backdrop-blur-md rounded-md text-[7px] text-white font-black uppercase tracking-widest gap-2 shadow-lg">
                         <span>{new Date(reg.created_at).toLocaleDateString()}</span>
                         <span className="opacity-50">|</span>
                         <span>{new Date(reg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                   </div>
                </div>
                <div className="flex items-center justify-between px-1">
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black uppercase text-black/60 tracking-wider mb-0.5 truncate">
                      {reg.user_name || reg.description || 'Registro'}
                    </p>
                    <p className="font-mono text-[6px] font-bold text-black/20 truncate">{reg.id}</p>
                  </div>
                  <div className="flex items-center gap-1.5 ml-2">
                    <button 
                      onClick={(e) => deleteRegistration(reg.id, e)}
                      className="w-7 h-7 bg-red-50 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm"
                      title="Eliminar registro"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-7 h-7 bg-green-50 text-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-3.5 h-3.5" />
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
        <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase mb-4 leading-none">Flyers Publi</h2>
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

const PrivacyPolicy = ({ onBack }: { onBack: () => void }) => {
  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <button onClick={onBack} className="mb-8 flex items-center gap-2 text-xs font-black uppercase tracking-widest hover:text-primary transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>
      
      <div className="bg-white p-8 md:p-12 rounded-[48px] shadow-xl border-4 border-black/5">
        <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-8 italic">Aviso de Privacidad</h1>
        
        <div className="space-y-8 text-black/70 leading-relaxed text-sm md:text-base font-medium">
          <section>
            <h2 className="text-xl font-black uppercase text-black mb-4">Identidad y Domicilio del Responsable</h2>
            <p>Cuponmanía, con domicilio en Alamo No. 8, Col. Los Reyes Iztacala, Tlalnepantla de Baz, Estado de México, C.P. 54090, es el responsable del tratamiento de los datos personales que usted nos proporcione a través de la plataforma.</p>
          </section>

          <section>
            <h2 className="text-xl font-black uppercase text-black mb-4">Datos Personales que Recabamos</h2>
            <p className="mb-4">Para llevar a cabo las finalidades descritas en este aviso, utilizaremos los siguientes datos:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Para Negocios/Patrocinadores:</strong> Nombre comercial, nombre del representante legal o contacto, teléfono de contacto (WhatsApp), correo electrónico, ubicación del establecimiento y materiales gráficos (logotipos y artes de cupones).</li>
              <li><strong>Para Usuarios finales:</strong> Nombre y correo electrónico.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black uppercase text-black mb-4">Finalidades del Tratamiento</h2>
            <p className="mb-4">Los datos personales que recabamos serán utilizados para las siguientes finalidades necesarias para la prestación del servicio:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Gestionar el alta y publicación de su negocio en el directorio comercial de Cuponmanía.</li>
              <li>Difundir sus ofertas y promociones dentro de la plataforma y redes sociales asociadas.</li>
              <li>Establecer contacto para fines de soporte técnico, aclaraciones sobre la suscripción y procesos de cobranza.</li>
              <li>Informar sobre actualizaciones, nuevas funcionalidades o cambios en los términos del servicio.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black uppercase text-black mb-4">Transferencia de Datos</h2>
            <p>Se hace de su conocimiento que la información comercial (nombre del negocio, ofertas, dirección pública y fotos) será visible para todos los usuarios de la aplicación con el fin de facilitar la redención de cupones. Sus datos personales de administración no serán compartidos con terceros, salvo por requerimiento de autoridad competente.</p>
          </section>

          <section>
            <h2 className="text-xl font-black uppercase text-black mb-4">Derechos ARCO</h2>
            <p>Usted tiene derecho a conocer qué datos personales tenemos de usted, para qué los utilizamos y las condiciones del uso que les damos. Asimismo, es su derecho solicitar la corrección de su información, que la eliminemos de nuestros registros o bases de datos, así como oponerse al uso de sus datos para fines específicos.</p>
            <p className="mt-4">Para el ejercicio de cualquiera de los derechos ARCO, usted deberá enviar una solicitud por escrito al correo electrónico: <strong>info@appdesigproyectos.com</strong>.</p>
          </section>

          <section>
            <h2 className="text-xl font-black uppercase text-black mb-4">Uso de Tecnologías de Rastreo</h2>
            <p>Nuestra plataforma utiliza cookies y herramientas analíticas para optimizar la experiencia de usuario y medir el alcance de las campañas publicitarias. Al navegar en la App, usted acepta el uso de estas tecnologías.</p>
          </section>

          <section className="pt-8 border-t border-black/5 mt-12">
            <p className="text-xs font-bold uppercase tracking-widest mb-2">Fecha de última actualización: Mayo 2026.</p>
            <p>Este aviso puede ser modificado por requerimientos legales o cambios en nuestro modelo de negocio. Cualquier actualización será publicada directamente en esta sección dentro de la App.</p>
          </section>
        </div>
      </div>
    </div>
  );
};

const AuthView = ({ onAuth, users, upsertProfile, onBack, initialRole = 'usuario', initialIsRegister = false, onShowPrivacy }: { 
  onAuth: (user: UserProfile) => void; 
  users: UserProfile[]; 
  upsertProfile: (user: UserProfile, isRegistration?: boolean) => Promise<UserProfile | null>; 
  onBack?: () => void;
  initialRole?: UserRole;
  initialIsRegister?: boolean;
  onShowPrivacy?: () => void;
}) => {
  const [isRegister, setIsRegister] = useState(initialIsRegister);
  const [role, setRole] = useState<UserRole>(initialRole);
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
    photo: null as string | null,
    acceptPrivacy: false
  });

  const [newService, setNewService] = useState('');

  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (isRegister) {
      if (!formData.acceptPrivacy) {
        setError('Debes aceptar el aviso de privacidad');
        setLoading(false);
        return;
      }
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
      
      upsertProfile(newUser, true).then((savedProfile) => {
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

          {isRegister && (
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-2xl mt-4">
              <input 
                type="checkbox" 
                id="privacy-auth" 
                checked={formData.acceptPrivacy} 
                onChange={e => setFormData(p => ({ ...p, acceptPrivacy: e.target.checked }))}
                className="mt-1 w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="privacy-auth" className="text-[10px] font-bold text-black/60 leading-snug">
                He leído y acepto el <button type="button" onClick={onShowPrivacy} className="text-secondary font-black hover:underline">Aviso de Privacidad</button>. Entiendo que mis datos serán procesados según este aviso.
              </label>
            </div>
          )}

          {error && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest text-center mt-4">{error}</p>}

          <button 
            type="submit" 
            disabled={loading || (isRegister && !formData.acceptPrivacy)}
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

  const offerText = config?.data?.oferta?.texto || 'OFERTA ESPECIAL';
  
  // Dynamic font size calculation based on the text length (keeps text legible and automatically adjusts)
  const getOfferFontSize = (text: string) => {
    const len = text?.length || 0;
    if (len <= 8) return 84;
    if (len <= 15) return 72;
    if (len <= 25) return 60;
    if (len <= 35) return 48;
    if (len <= 50) return 42;
    if (len <= 70) return 36;
    return 30; // Minimum size for extremely long texts
  };

  const offerFontSize = getOfferFontSize(offerText);
  const offerLineHeight = offerFontSize > 64 ? '0.85' : offerFontSize > 44 ? '1.0' : '1.1';
  const gapClass = offerText.length > 45 ? 'gap-3' : 'gap-6';

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

      <div className="relative h-full w-full p-12 flex flex-col justify-between z-10 font-sans">
        
        {/* Top Section */}
        <div className="flex flex-1 flex-row items-center justify-between gap-10">
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
          <div className={`flex-1 flex flex-col items-end justify-center text-right ${gapClass}`}>
            <h2 
              style={{ fontSize: `${offerFontSize}px`, lineHeight: offerLineHeight }}
              className="font-black uppercase drop-shadow-[0_15px_30px_rgba(0,0,0,0.4)] text-white tracking-tighter"
            >
              {offerText}
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
                  onClick={() => {
                    const cleanPhone = sponsor.whatsapp.replace(/\+/g, '').replace(/\s/g, '').replace(/\D/g, '');
                    const optPhone = cleanPhone.startsWith('52') || cleanPhone.length > 10 ? cleanPhone : `52${cleanPhone}`;
                    const msg = encodeURIComponent('!! Vi tu negocio en Enlace izcalli, necesito más información !!');
                    window.open(`https://wa.me/${optPhone}?text=${msg}`, '_blank');
                  }}
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
                      onClick={() => {
                        const cleanPhone = sponsor.whatsapp.replace(/\+/g, '').replace(/\s/g, '').replace(/\D/g, '');
                        const optPhone = cleanPhone.startsWith('52') || cleanPhone.length > 10 ? cleanPhone : `52${cleanPhone}`;
                        const msg = encodeURIComponent('!! Vi tu negocio en Enlace izcalli, necesito más información !!');
                        window.open(`https://wa.me/${optPhone}?text=${msg}`, '_blank');
                      }}
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
                      href={`https://wa.me/${(() => {
                        const cleanPhone = sponsor.whatsapp.replace(/\+/g, '').replace(/\s/g, '').replace(/\D/g, '');
                        return cleanPhone.startsWith('52') || cleanPhone.length > 10 ? cleanPhone : `52${cleanPhone}`;
                      })()}?text=${encodeURIComponent('!! Vi tu negocio en Enlace izcalli, necesito más información !!')}`}
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

const CouponCard = memo(({ coupon, onSave, onLike, isSaved, isLiked, sponsor, onShowSponsor, showFeedback }: { 
  coupon: CuponConfig; 
  onSave: (id: string) => void; 
  onLike: (id: string) => void;
  isSaved: boolean;
  isLiked: boolean;
  sponsor?: UserProfile | null;
  onShowSponsor: (s: UserProfile) => void;
  showFeedback?: (msg: string, type?: 'success' | 'error') => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);

  // Lightbox Zoom, Pan and Rotation states
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPinchDist, setInitialPinchDist] = useState<number | null>(null);
  const [initialPinchScale, setInitialPinchScale] = useState(1);
  const [lightboxBaseScale, setLightboxBaseScale] = useState(1);

  const handleShare = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const shareText = `¡Mira este súper cupón de ${coupon.data.header.nombre_negocio} - "${coupon.data.oferta.texto}" en Cuponmanía!`;
    const shareTitle = `Cupón de ${coupon.data.header.nombre_negocio}`;
    
    if (navigator.share) {
      try {
        if (coupon.imageData) {
          try {
            // Convert base64 data to blob and then to File
            const res = await fetch(coupon.imageData);
            const blob = await res.blob();
            const file = new File([blob], `cupon-${coupon.data.header.nombre_negocio.toLowerCase().replace(/\s+/g, '-')}.png`, { type: 'image/png' });
            
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({
                files: [file],
                title: shareTitle,
                text: shareText
              });
              if (showFeedback) showFeedback('¡Acción de compartir abierta!');
              return;
            }
          } catch (fileErr) {
            console.error('Error in file sharing process:', fileErr);
          }
        }
        
        // Fallback share with text/link
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: window.location.href
        });
        if (showFeedback) showFeedback('¡Acción de compartir abierta!');
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err);
          copyToClipboard();
        }
      }
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    const text = `¡Descubre este cupón de ${coupon.data.header.nombre_negocio} en Cuponmanía! Oferta: ${coupon.data.oferta.texto} - Sigue este enlace para más novedades: ${window.location.href}`;
    navigator.clipboard.writeText(text).then(() => {
      if (showFeedback) {
        showFeedback('¡Copiado al portapapeles para compartir!');
      } else {
        alert('Copiado al portapapeles. ¡Compártelo con tus amigos!');
      }
    }).catch(err => {
      console.error('Error copying:', err);
    });
  };

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

  // Update dynamic base scale for lightbox on screen resize
  useEffect(() => {
    if (!isZoomed) return;
    const calculateBaseScale = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // Subtract margins and headers/footers space
      const calculated = Math.min((w - 48) / 1000, (h - 220) / 550);
      setLightboxBaseScale(Math.min(1.2, Math.max(0.3, calculated)));
    };
    calculateBaseScale();
    window.addEventListener('resize', calculateBaseScale);
    return () => window.removeEventListener('resize', calculateBaseScale);
  }, [isZoomed]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const getTouchDistance = (t1: React.Touch, t2: React.Touch) => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - panOffset.x, y: e.touches[0].clientY - panOffset.y });
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const dist = getTouchDistance(e.touches[0], e.touches[1]);
      setInitialPinchDist(dist);
      setInitialPinchScale(zoomScale);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && e.touches.length === 1) {
      setPanOffset({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y
      });
    } else if (e.touches.length === 2 && initialPinchDist !== null) {
      const dist = getTouchDistance(e.touches[0], e.touches[1]);
      const factor = dist / initialPinchDist;
      const newScale = Math.min(4, Math.max(0.5, initialPinchScale * factor));
      setZoomScale(newScale);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setInitialPinchDist(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY;
    const factor = delta < 0 ? 1.15 : 0.85;
    const newScale = Math.min(4, Math.max(0.5, zoomScale * factor));
    setZoomScale(newScale);
  };

  const handleReset = () => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
    setRotation(0);
  };

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
        <div 
          onClick={() => setIsZoomed(true)}
          className="flex justify-center overflow-hidden relative group/ticket cursor-zoom-in rounded-[32px] shadow-sm hover:shadow-xl transition-all duration-300 border border-black/5" 
          style={{ width: `${1000 * scale}px`, height: `${550 * scale}px` }}
        >
          {coupon.imageData ? (
            <img 
              src={coupon.imageData} 
              className="w-full h-full object-contain transition-transform duration-500 group-hover/ticket:scale-[1.03]" 
              alt="Coupon Image"
              loading="lazy"
            />
          ) : (
            <div className="transition-transform duration-500 group-hover/ticket:scale-[1.03]">
              <CouponTicket config={coupon} scale={scale} origin="origin-top" />
            </div>
          )}

          {/* Premium Hover Zoom Overlay Indicator */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/ticket:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-2 text-white z-30">
            <ZoomIn className="w-7 h-7 animate-pulse text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest bg-black/60 px-4 py-2 rounded-full backdrop-blur-md border border-white/10 shadow-lg">
              Ampliar / Zoom
            </span>
          </div>
        </div>
      </motion.div>

      {/* GORGEOUS IN-APP FULLSCREEN ZOOM LIGHTBOX */}
      <AnimatePresence>
        {isZoomed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-xl flex flex-col justify-between items-center p-4 md:p-8 select-none"
            onWheel={handleWheel}
          >
            {/* Lightbox Header - Brand Branding and Close Button */}
            <div className="w-full flex justify-between items-center z-[1010] max-w-6xl">
              <div className="flex flex-col">
                <span className="text-primary text-[10px] font-black uppercase tracking-widest bg-primary/15 px-3 py-1.5 rounded-full border border-primary/20 w-fit">
                  {normalizeCategory(coupon.data.categoria)}
                </span>
                <span className="text-white text-xl md:text-2xl font-black uppercase tracking-tight mt-2 leading-none">
                  {coupon.data.header.nombre_negocio}
                </span>
              </div>
              
              <button 
                onClick={() => {
                  setIsZoomed(false);
                  handleReset();
                }}
                className="p-3 bg-white/10 hover:bg-white/20 select-none text-white rounded-full transition-all cursor-pointer border border-white/5 active:scale-95 z-50 hover:rotate-90 duration-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Stage where dragging and gestures occur */}
            <div 
              className="flex-1 w-full flex items-center justify-center overflow-hidden touch-none relative cursor-grab active:cursor-grabbing"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div 
                style={{ 
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${lightboxBaseScale * zoomScale}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center'
                }}
                className="transition-transform duration-75 select-none pointer-events-none force-no-responsive"
              >
                {coupon.imageData ? (
                  <img 
                    src={coupon.imageData} 
                    className="w-[1000px] h-[550px] object-contain rounded-[32px] shadow-2xl bg-black" 
                    alt="Coupon Image Large"
                  />
                ) : (
                  <CouponTicket config={coupon} scale={1} origin="origin-center" />
                )}
              </div>
            </div>

            {/* Controls panel */}
            <div className="w-full flex flex-col items-center gap-4 z-[1010] max-w-xl mb-4">
              <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest text-center">
                Pellizca con 2 dedos • Rueda del mouse • Arrastra para explorar
              </p>
              
              <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 flex items-center gap-4 md:gap-5 shadow-xl w-fit">
                <button 
                  onClick={() => setZoomScale(s => Math.max(0.5, s / 1.25))}
                  className="text-white hover:text-primary transition-colors p-2 cursor-pointer active:scale-95"
                  title="Alejar"
                >
                  <ZoomOut className="w-5 h-5" />
                </button>
                
                <button 
                  onClick={() => setZoomScale(s => Math.min(4, s * 1.25))}
                  className="text-white hover:text-primary transition-colors p-2 cursor-pointer active:scale-95"
                  title="Acercar"
                >
                  <ZoomIn className="w-5 h-5" />
                </button>

                <div className="w-[1px] h-4 bg-white/20" />

                <button 
                  onClick={() => setRotation(r => (r + 90) % 360)}
                  className="text-white hover:text-primary transition-colors p-2 cursor-pointer flex items-center gap-1.5 active:scale-95"
                  title="Girar 90°"
                >
                  <RotateCw className="w-5 h-5" />
                  <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Girar 90°</span>
                </button>

                <div className="w-[1px] h-4 bg-white/20" />

                <button 
                  onClick={() => handleShare()}
                  className="text-white hover:text-primary transition-colors p-2 cursor-pointer flex items-center gap-1.5 active:scale-95"
                  title="Compartir"
                >
                  <Share2 className="w-5 h-5 text-primary animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline text-primary">Compartir</span>
                </button>

                <div className="w-[1px] h-4 bg-white/20" />

                <button 
                  onClick={handleReset}
                  className="text-white hover:text-primary transition-colors text-[9px] font-black uppercase tracking-widest px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-full border border-white/5 cursor-pointer active:scale-95"
                  title="Restablecer"
                >
                  Reset
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

          <button 
            onClick={handleShare}
            className="flex-1 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 border border-black/5 bg-white hover:bg-gray-50 text-black/60 shadow-sm"
            title="Compartir cupón"
          >
            <Share2 className="w-5 h-5 text-amber-500" />
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


const MarketplaceView = ({ coupons, savedIds, likedIds, onSave, onLike, onShowFlyer, flyerLink, users, onShowSponsor, isLoading, isAdmin, onDelete, showFeedback, zoneFilter }: { 
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
  showFeedback?: (msg: string, type?: 'success' | 'error') => void;
  zoneFilter?: 'izcalli' | 'tlalnepantla';
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [selectedEnlaceFilter, setSelectedEnlaceFilter] = useState<'todos' | 'izcalli' | 'tlalnepantla'>('todos');

  const [showTour, setShowTour] = useState<boolean>(() => {
    return localStorage.getItem('cuponmania_marketplace_tour_shown') !== 'true';
  });
  const [tourStep, setTourStep] = useState<number>(0);

  const tourSteps = [
    {
      title: "¡Te damos la bienvenida al Marketplace! 🎫",
      subtitle: zoneFilter === 'tlalnepantla' ? "Descubre promociones de impacto en Tlalnepantla" : "Descubre promociones de impacto en Izcalli",
      content: "Aquí encontrarás una selección curada de cupones y ofertas exclusivas de patrocinadores y comercios locales. El acceso es totalmente público y transparente.",
      icon: <Ticket className="w-12 h-12 text-[#008F9A] animate-pulse" />,
      color: "from-teal-500/10 to-emerald-500/10 text-teal-600"
    },
    {
      title: "Guarda tus cupones preferidos 💾",
      subtitle: "Consérvalos en tu cuponera personal",
      content: "Haz clic en el botón con el ícono de disco en la tarjeta del cupón. Esto lo guardará instantáneamente en tu cuponera / billetera para que puedas verlo o canjearlo cuando quieras, ¡incluso de forma presencial!",
      icon: <Save className="w-12 h-12 text-secondary animate-bounce" />,
      color: "from-secondary/10 to-indigo-500/10 text-secondary"
    },
    {
      title: "Abre y Redime en Pantalla Completa 🔍",
      subtitle: "Interacción táctil y visual",
      content: "Haz clic o toca la imagen de cualquier cupón para abrir el Visor de Alta Definición. ¡Puedes arrastrarlo con el dedo, ampliarlo con 'zoom pellizco' y girarlo! Muéstraselo al patrocinador para canjear tu oferta.",
      icon: <ZoomIn className="w-12 h-12 text-amber-500" />,
      color: "from-amber-500/10 to-orange-500/10 text-amber-600"
    },
    {
      title: "Conoce a tus Patrocinadores 🏪",
      subtitle: "Ubicación, redes y contacto",
      content: "Usa el botón 'Info Negocio' para conocer la ubicación, redes sociales, horarios de atención y contacto del negocio que patrocina la oferta. ¡Apoyemos juntos lo local!",
      icon: <Store className="w-12 h-12 text-emerald-500" />,
      color: "from-emerald-500/10 to-teal-500/10 text-emerald-600"
    }
  ];

  const handleNextStep = () => {
    if (tourStep < tourSteps.length - 1) {
      setTourStep(prev => prev + 1);
    } else {
      handleFinishTour();
    }
  };

  const handlePrevStep = () => {
    if (tourStep > 0) {
      setTourStep(prev => prev - 1);
    }
  };

  const handleFinishTour = () => {
    localStorage.setItem('cuponmania_marketplace_tour_shown', 'true');
    setShowTour(false);
    if (showFeedback) showFeedback('¡Excelente! Ahora estás listo para usar tus cupones.', 'success');
  };

  const zoneFilteredCoupons = useMemo(() => {
    if (!zoneFilter) return coupons;
    return coupons.filter(c => {
      const target = c.target_enlace || 'izcalli';
      if (zoneFilter === 'izcalli') {
        return target === 'izcalli' || target === 'ambas';
      } else {
        return target === 'tlalnepantla' || target === 'ambas';
      }
    });
  }, [coupons, zoneFilter]);

  const categories = useMemo(() => {
    const list = Array.from(new Set(zoneFilteredCoupons.map(c => normalizeCategory(c.data.categoria))))
      .filter((c): c is string => !!c)
      .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
    return ['Todos', ...list];
  }, [zoneFilteredCoupons]);

  const categoryCounts = useMemo(() => {
    let baseCoupons = zoneFilteredCoupons;
    if (!zoneFilter && selectedEnlaceFilter !== 'todos') {
      baseCoupons = baseCoupons.filter(c => {
        const target = c.target_enlace || 'izcalli';
        if (selectedEnlaceFilter === 'izcalli') {
          return target === 'izcalli' || target === 'ambas';
        } else {
          return target === 'tlalnepantla' || target === 'ambas';
        }
      });
    }

    const counts: { [key: string]: number } = {
      Todos: baseCoupons.length
    };

    baseCoupons.forEach(c => {
      const cat = normalizeCategory(c.data.categoria);
      if (cat) {
        counts[cat] = (counts[cat] || 0) + 1;
      }
    });

    return counts;
  }, [zoneFilteredCoupons, selectedEnlaceFilter, zoneFilter]);
  
  const filteredCoupons = useMemo(() => {
    let result = zoneFilteredCoupons;
    if (selectedCategory !== 'Todos') {
      result = result.filter(c => normalizeCategory(c.data.categoria) === selectedCategory);
    }
    if (!zoneFilter && selectedEnlaceFilter !== 'todos') {
      result = result.filter(c => {
        const target = c.target_enlace || 'izcalli';
        if (selectedEnlaceFilter === 'izcalli') {
          return target === 'izcalli' || target === 'ambas';
        } else {
          return target === 'tlalnepantla' || target === 'ambas';
        }
      });
    }
    return result.slice(0, 20);
  }, [zoneFilteredCoupons, selectedCategory, selectedEnlaceFilter, zoneFilter]);

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase mb-2 sm:mb-0 leading-none">
            {zoneFilter === 'tlalnepantla' ? 'Cuponmanía Tlalnepantla' : zoneFilter === 'izcalli' ? 'Cuponmanía Izcalli' : 'Explorar Cupones'}
          </h2>
          <button 
            type="button"
            onClick={() => {
              setTourStep(0);
              setShowTour(true);
            }}
            className="flex items-center gap-2 px-5 py-3.5 bg-secondary/10 hover:bg-secondary/20 text-secondary border border-secondary/20 text-[10px] font-black uppercase tracking-widest rounded-full transition-all self-start sm:self-auto cursor-pointer active:scale-95"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Guía Interactiva</span>
          </button>
        </div>
        {/* Category dropdown selector */}
        <div className="mb-6 relative z-30 max-w-sm">
          <label className="block text-[9px] font-black uppercase tracking-widest text-black/40 mb-2 ml-1">
            Filtrar Cupones por Categoría
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full bg-white border border-black/10 rounded-2xl px-5 py-3.5 flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-black shadow-sm cursor-pointer hover:bg-gray-50/85 transition-all text-left"
            >
              <span className="flex items-center gap-2 flex-1 mr-2 min-w-0">
                {selectedCategory === 'Todos' ? (
                  <LayoutGrid className="w-4 h-4 text-primary shrink-0" />
                ) : (
                  <Tag className="w-4 h-4 text-emerald-500 shrink-0" />
                )}
                <span className="truncate">{selectedCategory === 'Todos' ? 'Nuevos negocios' : selectedCategory}</span>
                <span className="ml-auto bg-black/5 text-black/70 text-[9px] font-black px-2 py-0.5 rounded-full shrink-0">
                  {categoryCounts[selectedCategory] || 0}
                </span>
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-250 shrink-0 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isDropdownOpen && (
                <>
                  {/* Overlay to close on tap/click outside */}
                  <div className="fixed inset-0 z-30" onClick={() => setIsDropdownOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 mt-2 w-full bg-white rounded-2xl shadow-xl border border-black/10 py-2 z-40 max-h-72 overflow-y-auto scrollbar-thin"
                  >
                    {categories.map(cat => {
                      const count = categoryCounts[cat] || 0;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(cat);
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full px-5 py-3 text-left text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-between cursor-pointer ${
                            selectedCategory === cat 
                              ? 'bg-gray-100 text-black font-black' 
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <span className="flex items-center gap-2 min-w-0 mr-2">
                            {cat === 'Todos' ? (
                              <LayoutGrid className="w-4 h-4 text-primary shrink-0" />
                            ) : (
                              <Tag className="w-4 h-4 text-emerald-500 shrink-0" />
                            )}
                            <span className="truncate">{cat === 'Todos' ? 'Nuevos negocios' : cat}</span>
                          </span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                            selectedCategory === cat 
                              ? 'bg-black/10 text-black' 
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Enlace Target Filter */}
        {!zoneFilter && (
          <div className="flex flex-wrap items-center gap-3 mt-6 border-t border-black/5 pt-6">
            <span className="text-[10px] font-black uppercase text-black/40 tracking-wider mr-2">Filtrar por Municipio/Enlace:</span>
            <button 
              type="button"
              onClick={() => setSelectedEnlaceFilter('todos')}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
                selectedEnlaceFilter === 'todos' 
                  ? 'bg-secondary text-white border-secondary shadow-md' 
                  : 'bg-white text-black/50 border-black/5 hover:border-black/15'
              }`}
            >
              Todos 🌍
            </button>
            <button 
              type="button"
              onClick={() => setSelectedEnlaceFilter('izcalli')}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
                selectedEnlaceFilter === 'izcalli' 
                  ? 'bg-secondary text-white border-secondary shadow-md' 
                  : 'bg-white text-black/50 border-black/5 hover:border-black/15'
              }`}
            >
              Enlace Izcalli 🏙️
            </button>
            <button 
              type="button"
              onClick={() => setSelectedEnlaceFilter('tlalnepantla')}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
                selectedEnlaceFilter === 'tlalnepantla' 
                  ? 'bg-secondary text-white border-secondary shadow-md' 
                  : 'bg-white text-black/50 border-black/5 hover:border-black/15'
              }`}
            >
              Enlace Tlalnepantla 🏘️
            </button>
          </div>
        )}
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
      ) : zoneFilteredCoupons.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-black/20 bg-white rounded-[40px] border border-dashed border-black/10 px-6 text-center shadow-sm py-12">
          <Ticket className="w-16 h-16 mb-6 opacity-40 text-primary animate-bounce" />
          <h3 className="font-black uppercase tracking-tighter text-lg md:text-xl text-black/80 mb-2">
            Próximamente Cuponmanía {zoneFilter === 'tlalnepantla' ? 'Tlalnepantla' : 'Izcalli'}
          </h3>
          <p className="text-[11px] text-black/50 font-bold max-w-md uppercase tracking-wider leading-relaxed">
            Espera muy pronto las promociones de la zona.
          </p>
        </div>
      ) : filteredCoupons.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-black/20 bg-white rounded-[40px] border border-dashed border-black/10">
          <LayoutGrid className="w-16 h-16 mb-4 opacity-50" />
          <p className="font-black uppercase tracking-widest text-xs">No hay cupones disponibles en la categoría "{selectedCategory === 'Todos' ? 'Nuevos negocios' : selectedCategory}"</p>
          <button 
            type="button"
            onClick={() => setSelectedCategory('Todos')}
            className="mt-6 px-10 py-4 bg-gray-50 hover:bg-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-black/40 transition-all cursor-pointer"
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
                showFeedback={showFeedback}
              />
            </div>
          ))}
        </div>
      )}
      </div>

      {/* EXQUISITE INTERACTIVE STEP TOUR MODAL FOR NEW USERS */}
      <AnimatePresence>
        {showTour && (
          <div className="fixed inset-0 z-[2000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-white text-black w-full max-w-lg rounded-[36px] overflow-hidden border border-black/5 shadow-2xl flex flex-col relative"
            >
              {/* Skip button in corner */}
              <button 
                onClick={handleFinishTour}
                className="absolute top-6 right-6 p-2 text-black/45 hover:text-black/80 hover:bg-black/5 rounded-full transition-all cursor-pointer text-xs font-black uppercase tracking-widest px-3 py-1"
                type="button"
              >
                Omitir
              </button>

              {/* Progress Line */}
              <div className="w-full h-1.5 bg-gray-100 flex">
                {tourSteps.map((_, idx) => (
                  <div 
                    key={idx}
                    className={`h-full flex-1 transition-all duration-300 ${idx <= tourStep ? 'bg-[#008F9A]' : 'bg-transparent'}`}
                  />
                ))}
              </div>

              {/* Icon Container with dynamic colored gradient background */}
              <div className={`p-10 pt-12 flex justify-center bg-gradient-to-br ${tourSteps[tourStep].color} transition-all duration-300`}>
                <motion.div
                  key={tourStep}
                  initial={{ scale: 0.7, opacity: 0, rotate: -15 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 100 }}
                  className="p-6 bg-white rounded-[24px] shadow-lg border border-black/5 flex items-center justify-center"
                >
                  {tourSteps[tourStep].icon}
                </motion.div>
              </div>

              {/* Content Panel */}
              <div className="p-8 md:p-10 text-center flex-1">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#008F9A] bg-[#008F9A]/10 px-3 py-1.5 rounded-full border border-[#008F9A]/10">
                  PASO {tourStep + 1} DE {tourSteps.length}
                </span>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={tourStep}
                    initial={{ x: 15, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -15, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="mt-6 space-y-3"
                  >
                    <h3 className="text-xl md:text-2xl font-black tracking-tight text-neutral-900 uppercase">
                      {tourSteps[tourStep].title}
                    </h3>
                    <p className="text-xs font-bold text-secondary tracking-wide uppercase opacity-70">
                      {tourSteps[tourStep].subtitle}
                    </p>
                    <p className="text-sm text-neutral-600 leading-relaxed font-medium">
                      {tourSteps[tourStep].content}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Navigation Actions Footer */}
              <div className="p-6 bg-neutral-50 border-t border-black/5 flex items-center justify-between gap-4">
                {/* Dots indicator */}
                <div className="flex gap-1.5 pl-2">
                  {tourSteps.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setTourStep(idx)}
                      className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${idx === tourStep ? 'bg-[#008F9A] w-6' : 'bg-black/15 hover:bg-black/30'}`}
                      type="button"
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  {tourStep > 0 && (
                    <button
                      onClick={handlePrevStep}
                      className="px-5 py-3.5 bg-white border border-black/5 hover:bg-gray-50 text-black/60 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95 cursor-pointer"
                      type="button"
                    >
                      Atrás
                    </button>
                  )}

                  <button
                    onClick={handleNextStep}
                    className="px-8 py-3.5 bg-secondary hover:bg-secondary-dark text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-secondary/20 active:scale-95 cursor-pointer"
                    type="button"
                  >
                    {tourStep === tourSteps.length - 1 ? "Comenzar" : "Siguiente"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const WalletView = ({ 
  coupons, 
  savedIds, 
  likedIds, 
  onSave, 
  onLike, 
  users, 
  onShowSponsor, 
  isLoading, 
  showFeedback,
  savedFlyerIds = [],
  likedFlyerIds = [],
  onToggleSaveFlyer,
  onToggleLikeFlyer
}: { 
  coupons: CuponConfig[]; 
  savedIds: string[]; 
  likedIds: string[];
  onSave: (id: string) => void;
  onLike: (id: string) => void;
  users: UserProfile[];
  onShowSponsor: (sponsor: UserProfile) => void;
  isLoading: boolean;
  showFeedback?: (msg: string, type?: 'success' | 'error') => void;
  savedFlyerIds?: string[];
  likedFlyerIds?: string[];
  onToggleSaveFlyer?: (id: string) => void;
  onToggleLikeFlyer?: (id: string) => void;
}) => {
  const [activeTab, setActiveTab] = useState<'coupons' | 'flyers'>('coupons');
  const [flyers, setFlyers] = useState<IzcalliFlyer[]>([]);

  const formatWhatsAppUrl = (phone: string) => {
    const clean = phone.replace(/\D/g, '');
    if (!clean) return '';
    const message = encodeURIComponent('!! Vi tu negocio en Enlace izcalli, necesito más información !!');
    if (clean.length > 10 && (clean.startsWith('52') || clean.startsWith('1'))) {
      return `https://wa.me/${clean}?text=${message}`;
    }
    return `https://wa.me/52${clean}?text=${message}`;
  };
  const [isFetchingFlyers, setIsFetchingFlyers] = useState(false);

  // Lightbox view states for deep zoom, pan, and rotate
  const [activeLightboxFlyer, setActiveLightboxFlyer] = useState<IzcalliFlyer | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lightboxBaseScale, setLightboxBaseScale] = useState(1);

  useEffect(() => {
    const loadFlyers = async () => {
      setIsFetchingFlyers(true);
      let loadedFlyers: IzcalliFlyer[] = [];
      try {
        const supabase = getSupabase();
        if (supabase) {
          const { data: dbFlyers, error } = await supabase
            .from('izcalli_flyers')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
          if (!error && dbFlyers) {
            loadedFlyers = dbFlyers.map(f => {
              let whatsapp = f.whatsapp || '';
              let phone = '';
              let target_enlace = 'izcalli';
              if (whatsapp.includes('||')) {
                const tokens = whatsapp.split('||');
                whatsapp = tokens[0] || '';
                tokens.forEach(token => {
                  if (token.startsWith('phone:')) {
                    phone = token.substring(6);
                  } else if (token.startsWith('enlace:')) {
                    target_enlace = token.substring(7);
                  }
                });
              } else {
                phone = f.phone || '';
              }
              return {
                id: f.id,
                title: f.title || '',
                imageUrl: f.image_url,
                category: f.category_name,
                creatorId: f.creator_id,
                creatorName: f.creator_name || 'Anónimo',
                createdAt: f.created_at,
                whatsapp: whatsapp,
                phone: phone,
                target_enlace: target_enlace as 'izcalli' | 'tlalnepantla' | 'ambas'
              };
            });
          }
        }
      } catch (err) {
        console.warn('Supabase read error inside WalletView:', err);
      }

      // Saneamiento preventivo de localStorage para eliminar flyers gigantescos del pasado y no agotar cuota (5MB)
      try {
        const localString = localStorage.getItem('izcalli_flyers_local');
        if (localString) {
          const parsed = JSON.parse(localString);
          if (Array.isArray(parsed)) {
            // Filtrar cualquier flyer pesado (ej. con base64 > 250KB) y limitar a 40 locales para prevenir QuotaExceededError de forma holgada
            const optimizedLocals = parsed
              .filter((item: any) => item && item.imageUrl && item.imageUrl.length < 250000)
              .slice(0, 40);
            localStorage.setItem('izcalli_flyers_local', JSON.stringify(optimizedLocals));
          }
        }
      } catch (e) {
        console.warn('Error durante saneamiento preventivo en App.tsx:', e);
      }

      const localFlyersStr = localStorage.getItem('izcalli_flyers_local');
      if (localFlyersStr) {
        try {
          const locals = JSON.parse(localFlyersStr);
          // Merge
          const existingIds = new Set(loadedFlyers.map(f => f.id));
          locals.forEach((lf: IzcalliFlyer) => {
            if (!existingIds.has(lf.id)) {
              loadedFlyers.push(lf);
            }
          });
        } catch (_) {}
      }

      // Ensure all flyers are explicitly sorted descending by creation date, so new ones appear first
      loadedFlyers.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      setFlyers(loadedFlyers);
      setIsFetchingFlyers(false);
    };

    loadFlyers();
  }, [savedFlyerIds]);

  // Update dynamic base scale for lightbox on screen resize (locked to 1 to use pure responsive css sizing)
  useEffect(() => {
    if (!activeLightboxFlyer) return;
    setLightboxBaseScale(1);
  }, [activeLightboxFlyer]);

  const savedCoupons = coupons.filter(c => savedIds.includes(c.id));
  const savedFlyers = flyers.filter(f => savedFlyerIds.includes(f.id));

  const handleShareFlyer = async (flyer: IzcalliFlyer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const shareText = `¡Mira este flyer publicitario de "${flyer.title}" en Enlace Izcalli!`;
    const shareTitle = flyer.title;

    if (navigator.share) {
      try {
        if (flyer.imageUrl.startsWith('data:image')) {
          const res = await fetch(flyer.imageUrl);
          const blob = await res.blob();
          const file = new File([blob], `flyer-${flyer.title.toLowerCase().replace(/\s+/g, '-')}.png`, { type: 'image/png' });

          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: shareTitle,
              text: shareText
            });
            return;
          }
        }
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: window.location.href
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          copyToClipboard(flyer);
        }
      }
    } else {
      copyToClipboard(flyer);
    }
  };

  const copyToClipboard = (flyer: IzcalliFlyer) => {
    const text = `¡Descubre este flyer en Enlace Izcalli! Título: ${flyer.title}. Organizado por: ${flyer.creatorName}. Sigue este enlace: ${window.location.href}`;
    navigator.clipboard.writeText(text).then(() => {
      if (showFeedback) showFeedback('¡Enlace de flyer copiado al portapapeles!');
    }).catch(() => {
      if (showFeedback) showFeedback('No se pudo copiar el enlace', 'error');
    });
  };

  // Lightbox handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY;
    const factor = delta < 0 ? 1.15 : 0.85;
    const newScale = Math.min(4, Math.max(0.5, zoomScale * factor));
    setZoomScale(newScale);
  };

  const handleReset = () => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
    setRotation(0);
  };

  return (
    <div className="w-full h-full p-6 md:p-12 overflow-x-hidden relative">
      <div className="mb-8 md:mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-4 leading-none">Mi Cuponera</h2>
          <p className="text-[10px] md:text-sm text-black/40 uppercase font-bold tracking-widest">Tus beneficios y flyers guardados</p>
        </div>

        {/* Navigation Tabs inside WalletView */}
        <div className="flex bg-black/5 p-1 rounded-2xl shrink-0 self-start md:self-auto select-none">
          <button
            onClick={() => setActiveTab('coupons')}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
              activeTab === 'coupons' 
                ? 'bg-white text-black shadow-sm' 
                : 'text-black/40 hover:text-black'
            }`}
          >
            Cupones ({savedCoupons.length})
          </button>
          <button
            onClick={() => setActiveTab('flyers')}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
              activeTab === 'flyers'
                ? 'bg-white text-black shadow-sm' 
                : 'text-black/40 hover:text-black'
            }`}
          >
            Digital Flyers ({savedFlyers.length})
          </button>
        </div>
      </div>

      {activeTab === 'coupons' ? (
        <>
          {isLoading && savedCoupons.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 animate-pulse">
               {[1,2,3,4].map(i => (
                 <div key={i} className="bg-black/5 rounded-3xl h-[400px]" />
               ))}
            </div>
          ) : savedCoupons.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-black/20">
              <Heart className="w-16 h-16 mb-4" />
              <p className="font-bold uppercase tracking-widest text-center">Tu cuponera está vacía</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-black/30 mt-2">Visita la sección Cuponmanía para guardar cupones</p>
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
                  showFeedback={showFeedback}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {isFetchingFlyers && savedFlyers.length === 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 animate-pulse">
               {[1,2,3,4].map(i => (
                 <div key={i} className="bg-black/5 rounded-3xl aspect-[4/5]" />
               ))}
            </div>
          ) : savedFlyers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-black/20">
              <Bookmark className="w-16 h-16 mb-4" />
              <p className="font-bold uppercase tracking-widest text-center">No tienes flyers guardados</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-black/30 mt-2">Visita Enlace Izcalli para guardar tus flyers favoritos</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {savedFlyers.map(flyer => (
                <motion.div
                  key={flyer.id}
                  onClick={() => {
                    setActiveLightboxFlyer(flyer);
                    setZoomScale(1);
                    setPanOffset({ x: 0, y: 0 });
                    setRotation(0);
                  }}
                  className="group relative bg-white border border-black/5 rounded-[24px] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-zoom-in flex flex-col h-full overflow-hidden"
                >
                  <div className="p-3 pb-1 flex items-center justify-between border-b border-black/5 bg-gray-50 text-[8px] font-black uppercase tracking-widest text-black/40 truncate select-none">
                    <span className="flex items-center gap-1 shrink-0 bg-white border border-black/5 px-2 py-0.5 rounded-full text-[7px] text-teal-600">
                      {flyer.category}
                    </span>
                    <span className="truncate max-w-[50%]">{flyer.creatorName}</span>
                  </div>

                  <div className="flex-1 overflow-hidden aspect-[4/5] bg-neutral-950 relative">
                    <img 
                      src={flyer.imageUrl} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                      loading="lazy"
                      alt={flyer.title}
                    />
                    
                    <div className="absolute inset-0 bg-teal-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-1.5 text-white z-10">
                      <ZoomIn className="w-6 h-6 animate-pulse" />
                      <span className="text-[8px] font-black uppercase tracking-widest bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-md">
                        Ver Mas Grande
                      </span>
                    </div>

                    {/* Floating One-Click Quick Contacts */}
                    {(flyer.whatsapp || flyer.phone) && (
                      <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center z-30 gap-2 pointer-events-none">
                        <div className="flex gap-1.5 pointer-events-auto">
                          {flyer.whatsapp && (
                            <a
                              href={formatWhatsAppUrl(flyer.whatsapp)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                              className="w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white flex items-center justify-center shadow-lg transition-all"
                              title={`WhatsApp: ${flyer.whatsapp}`}
                            >
                              <MessageCircle className="w-4 h-4 fill-white text-emerald-500" />
                            </a>
                          )}
                          {flyer.phone && (
                            <a
                              href={`tel:${flyer.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="w-8 h-8 rounded-full bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white flex items-center justify-center shadow-lg transition-all"
                              title={`Llamar: ${flyer.phone}`}
                            >
                              <Phone className="w-4 h-4 fill-white text-indigo-500" />
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-white flex items-center justify-between gap-2 border-t border-black/5 shrink-0">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-[10px] font-black uppercase tracking-tight text-gray-800 truncate leading-none">
                        {flyer.title}
                      </h4>
                      <span className="text-[7px] font-bold text-gray-400 uppercase tracking-widest block mt-1 leading-none">
                        {new Date(flyer.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>

                    <div className="flex gap-1 items-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onToggleLikeFlyer) onToggleLikeFlyer(flyer.id);
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${
                          likedFlyerIds.includes(flyer.id) 
                            ? 'bg-red-50 text-red-500' 
                            : 'hover:bg-neutral-100 text-gray-400 hover:text-red-500'
                        }`}
                        title="Me gusta"
                      >
                        <Heart className={`w-3.5 h-3.5 ${likedFlyerIds.includes(flyer.id) ? 'fill-current' : ''}`} />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onToggleSaveFlyer) onToggleSaveFlyer(flyer.id);
                        }}
                        className="p-1.5 bg-teal-50 text-teal-600 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors"
                        title="Remover de la Cuponera"
                      >
                        <Bookmark className="w-3.5 h-3.5 fill-current" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShareFlyer(flyer, e);
                        }}
                        className="p-1.5 hover:bg-neutral-100 rounded-lg text-gray-500 hover:text-teal-600 transition-colors"
                        title="Compartir"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* LIGHTBOX FOR SAVED FLYERS INSIDE WALLET */}
      <AnimatePresence>
        {activeLightboxFlyer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-xl flex flex-col justify-between items-center p-4 md:p-8 select-none"
            onWheel={handleWheel}
          >
            <div className="w-full flex justify-between items-center z-[1010] max-w-6xl mt-2 select-none">
              <div className="flex flex-col text-left">
                <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest bg-emerald-400/15 px-3 py-1.5 rounded-full border border-emerald-400/20 w-fit">
                  {activeLightboxFlyer.category}
                </span>
                <span className="text-white text-xl md:text-2xl font-black uppercase tracking-tight mt-2 leading-none text-left">
                  {activeLightboxFlyer.title}
                </span>
                <span className="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-1 text-left">
                  Publicado por: {activeLightboxFlyer.creatorName}
                </span>

                {/* Direct tactile contact buttons for Lightbox */}
                {(activeLightboxFlyer.whatsapp || activeLightboxFlyer.phone) && (
                  <div className="flex flex-wrap gap-2 mt-3 select-none">
                    {activeLightboxFlyer.whatsapp && (
                      <a
                        href={formatWhatsAppUrl(activeLightboxFlyer.whatsapp)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-4 py-2.5 text-[9px] font-black uppercase tracking-widest rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white flex items-center gap-2 shadow-lg hover:scale-105 transition-all"
                      >
                        <MessageCircle className="w-4 h-4 fill-white text-emerald-500" />
                        <span>Chat de WhatsApp</span>
                      </a>
                    )}
                    {activeLightboxFlyer.phone && (
                      <a
                        href={`tel:${activeLightboxFlyer.phone}`}
                        className="px-4 py-2.5 text-[9px] font-black uppercase tracking-widest rounded-xl bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white flex items-center gap-2 shadow-lg hover:scale-105 transition-all"
                      >
                        <Phone className="w-4 h-4 fill-white text-indigo-500" />
                        <span>Llamar por Teléfono</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
              
              <button 
                onClick={() => {
                  setActiveLightboxFlyer(null);
                  handleReset();
                }}
                className="p-3 bg-white/10 hover:bg-white/20 select-none text-white rounded-full transition-all cursor-pointer border border-white/5 active:scale-95 z-50 hover:rotate-90 duration-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div 
              className="flex-1 w-full flex items-center justify-center overflow-hidden touch-none relative cursor-grab active:cursor-grabbing"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <div 
                style={{ 
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${lightboxBaseScale * zoomScale}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center'
                }}
                className="transition-transform duration-75 select-none pointer-events-none flex items-center justify-center w-full h-full"
              >
                <img 
                  src={activeLightboxFlyer.imageUrl} 
                  className="w-full h-auto max-w-[95vw] max-h-[72vh] md:max-w-[1000px] md:max-h-[580px] object-contain rounded-2xl md:rounded-[24px] shadow-2xl bg-neutral-900" 
                  alt={activeLightboxFlyer.title}
                />
              </div>
            </div>

            <div className="w-full flex flex-col items-center gap-4 z-[1010] max-w-xl mb-4">
              <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest text-center">
                Pellizca con 2 dedos • Rueda del mouse • Arrastra para explorar
              </p>
              
              <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 flex items-center gap-4 md:gap-5 shadow-xl w-fit">
                <button 
                  onClick={() => setZoomScale(s => Math.max(0.5, s / 1.25))}
                  className="text-white hover:text-emerald-400 transition-colors p-2 cursor-pointer active:scale-95"
                  title="Alejar"
                >
                  <ZoomOut className="w-5 h-5" />
                </button>
                
                <button 
                  onClick={() => setZoomScale(s => Math.min(4, s * 1.25))}
                  className="text-white hover:text-emerald-400 transition-colors p-2 cursor-pointer active:scale-95"
                  title="Acercar"
                >
                  <ZoomIn className="w-5 h-5" />
                </button>

                <div className="w-[1px] h-4 bg-white/20" />

                <button 
                  onClick={() => {
                    if (onToggleLikeFlyer) onToggleLikeFlyer(activeLightboxFlyer.id);
                  }}
                  className={`transition-colors p-2 cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                    likedFlyerIds.includes(activeLightboxFlyer.id) ? 'text-red-500' : 'text-white hover:text-red-500'
                  }`}
                  title="Me gusta"
                >
                  <Heart className={`w-5 h-5 ${likedFlyerIds.includes(activeLightboxFlyer.id) ? 'fill-current' : ''}`} />
                  <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">
                    {likedFlyerIds.includes(activeLightboxFlyer.id) ? 'Te Gusta' : 'Me Gusta'}
                  </span>
                </button>

                <div className="w-[1px] h-4 bg-white/20" />

                <button 
                  onClick={() => {
                    if (onToggleSaveFlyer) onToggleSaveFlyer(activeLightboxFlyer.id);
                  }}
                  className={`transition-colors p-2 cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                    savedFlyerIds.includes(activeLightboxFlyer.id) ? 'text-teal-400' : 'text-white hover:text-teal-400'
                  }`}
                  title="Remover"
                >
                  <Bookmark className={`w-5 h-5 ${savedFlyerIds.includes(activeLightboxFlyer.id) ? 'fill-current' : ''}`} />
                  <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">
                    {savedFlyerIds.includes(activeLightboxFlyer.id) ? 'Guardado' : 'Guardar'}
                  </span>
                </button>

                <div className="w-[1px] h-4 bg-white/20" />

                <button 
                  onClick={() => handleShareFlyer(activeLightboxFlyer)}
                  className="text-emerald-400 hover:text-emerald-300 transition-colors p-2 cursor-pointer flex items-center gap-1.5 active:scale-95"
                  title="Compartir"
                >
                  <Share2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Compartir</span>
                </button>

                <div className="w-[1px] h-4 bg-white/20" />

                <button 
                  onClick={handleReset}
                  className="text-white hover:text-emerald-400 transition-colors text-[9px] font-black uppercase tracking-widest px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-full border border-white/5 cursor-pointer active:scale-95"
                  title="Restablecer"
                >
                  Reset
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
        <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase mb-4 leading-none">Mi Perfil</h2>
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
        <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-4 leading-none">Mis Cupones</h2>
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
    try {
      const saved = localStorage.getItem('cuponmania_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error('Error parsing saved user:', e);
      return null;
    }
  });

  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isFlyerFullscreen, setIsFlyerFullscreen] = useState(false);
  const [flyerLinks, setFlyerLinks] = useState({ 
    flyer1: 'https://cossma.com.mx/cuponmaniaflyer1.png', 
    flyer2: 'https://cossma.com.mx/cuponmaniaflyer2.png' 
  });

  const [cuponmaniaEnabled, setCuponmaniaEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('cuponmania_enabled_local');
    return saved === null ? true : saved === 'true';
  });

  const fetchCuponmaniaSettings = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) return;
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'cuponmania_config')
        .maybeSingle();
      
      if (!error && data && data.value) {
        const val = data.value as any;
        const isEnabled = val?.enabled === undefined ? true : !!val.enabled;
        setCuponmaniaEnabled(isEnabled);
        localStorage.setItem('cuponmania_enabled_local', isEnabled ? 'true' : 'false');
      }
    } catch (err) {
      console.warn('Failed to fetch Cuponmania settings:', err);
    }
  };

  const updateCuponmaniaSettings = async (enabled: boolean) => {
    setCuponmaniaEnabled(enabled);
    localStorage.setItem('cuponmania_enabled_local', enabled ? 'true' : 'false');
    try {
      const supabase = getSupabase();
      if (!supabase) return;
      
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key: 'cuponmania_config', value: { enabled } }, { onConflict: 'key' });
      
      if (!error) {
        showFeedback(`Módulo Cuponmanía ${enabled ? 'activado' : 'desactivado'} con éxito`);
      } else {
        console.error('Supabase error saving cuponmania setting:', error);
        showFeedback('Guardado localmente', 'success');
      }
    } catch (err) {
      console.error('Error saving setting:', err);
      showFeedback('Guardado localmente', 'success');
    }
  };

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
    fetchCuponmaniaSettings();
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
      if (!supabase) return;
      const channel = supabase
        .channel('notifications_changes')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${currentUser.id}`
        }, (payload) => {
          fetchNotifications();
          // If it's a new coupon notification OR we are admin, show flashy alert
          if (payload.new.title.includes('Cupón') || currentUser.role === 'admin') {
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

  const resetAllForms = (user?: UserProfile | null) => {
    setFormData({
      nombre_negocio: user?.businessName || '',
      rubro: '',
      categoria: '',
      oferta_principal: '',
      detalles_adicionales: '',
      horas_vigencia: '24',
      fecha_inicio: new Date().toISOString().split('T')[0],
      fecha_fin: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      logo_data: user?.photo || '',
      website: user?.website || ''
    });
    setCoupon(null);
    setToast(null);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('cuponmania_user');
    localStorage.removeItem('cuponmania_view');
    setActiveView('enlace_izcalli');
    resetAllForms(null);
    showFeedback('Sesión cerrada correctamente');
  };

  const [users, setUsers] = useState<UserProfile[]>(() => {
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
    try {
      const saved = localStorage.getItem('cuponmania_users_list');
      if (!saved) return [adminUser];
      const list = JSON.parse(saved);
      if (!Array.isArray(list)) return [adminUser];
      if (!list.find((u: any) => u.username === 'appdesign')) {
        return [...list, adminUser];
      }
      return list;
    } catch (e) {
      console.error('Error parsing users list:', e);
      return [adminUser];
    }
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
      if (!supabase) return;
      
      let { data, error } = await supabase.from('profiles').select('*');
      if (error) {
        console.error('Error fetching profiles from Supabase:', error.message);
        return;
      }

      if (data) {
        // --- AUTO-MIGRACIÓN DE LOCALSTORAGE A SUPABASE ---
        // Sincroniza perfiles guardados localmente para evitar pérdidas tras la integración de Supabase
        try {
          const localStr = localStorage.getItem('cuponmania_users_list');
          if (localStr) {
            const locals = JSON.parse(localStr);
            if (Array.isArray(locals)) {
              let migratedAny = false;
              for (const localUser of locals) {
                if (!localUser || !localUser.username || localUser.username === 'appdesign') continue;
                
                const existsInDb = data.some(p => p.username === localUser.username);
                if (!existsInDb) {
                  console.log('Migrando usuario local a Supabase:', localUser.username);
                  const payload = {
                    id: (localUser.id && localUser.id.includes('-')) ? localUser.id : crypto.randomUUID(),
                    username: localUser.username,
                    email: localUser.email,
                    name: localUser.name,
                    role: localUser.role || 'usuario',
                    whatsapp: localUser.whatsapp,
                    photo: localUser.photo,
                    business_name: localUser.businessName,
                    representative_name: localUser.representativeName,
                    address: localUser.address,
                    location_link: localUser.locationLink,
                    website: localUser.website,
                    services: Array.isArray(localUser.services) ? localUser.services : [],
                    is_active: localUser.isActive !== false
                  };
                  const { error: upsertErr } = await supabase.from('profiles').upsert(payload, { onConflict: 'username' });
                  if (!upsertErr) {
                    migratedAny = true;
                  }
                }
              }
              if (migratedAny) {
                // Si migramos, refrescamos los datos actuales
                const { data: freshData } = await supabase.from('profiles').select('*');
                if (freshData) {
                  data = freshData;
                }
              }
            }
          }
        } catch (e) {
          console.error('Error during automatic offline users migration:', e);
        }

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

  const upsertProfile = async (profile: UserProfile, isRegistration: boolean = false): Promise<UserProfile | null> => {
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
          // Si es registro, notificamos al admin
          if (isRegistration) {
             await supabase.rpc('notify_admins', {
               p_title: `Nuevo Registro: ${profile.role === 'patrocinador' ? 'Patrocinador' : 'Usuario'}`,
               p_message: `${profile.name} se ha unido. ID: @${profile.username}`,
               p_type: 'info'
             });
          }

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
          setUsers(prev => {
            const hasUser = prev.some(u => u.id === data.id || u.username === data.username);
            if (hasUser) {
              return prev.map(u => (u.id === data.id || u.username === data.username) ? freshProfile : u);
            }
            return [...prev, freshProfile];
          });
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
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [installTab, setInstallTab] = useState<'android' | 'ios'>(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    return isIOS ? 'ios' : 'android';
  });
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

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setDeferredPrompt(null);
          showFeedback('¡App de Cuponmanía instalada con éxito!', 'success');
        }
      } catch (err) {
        console.error("Install prompt error:", err);
        setShowInstallModal(true);
      }
    } else {
      setShowInstallModal(true);
    }
  };
  const [coupon, setCoupon] = useState<CuponConfig | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    return (localStorage.getItem('cuponmania_role') as UserRole) || 'usuario';
  });
  const [activeView, setActiveView] = useState<AppView>(() => {
    const savedView = localStorage.getItem('cuponmania_view') as AppView;
    const isConfigEnabled = localStorage.getItem('cuponmania_enabled_local') !== 'false';
    const savedRole = (localStorage.getItem('cuponmania_role') as UserRole) || 'usuario';

    if (savedView) {
      if (!isConfigEnabled && savedRole !== 'admin' && savedRole !== 'patrocinador' && (savedView === 'marketplace' || savedView === 'wallet' || savedView === 'enlace_izcalli')) {
        return 'enlace_izcalli';
      }
      return savedView;
    }

    if (savedRole === 'admin') return 'admin_dashboard';
    if (savedRole === 'patrocinador') return 'generator';
    return 'enlace_izcalli';
  });

  useEffect(() => {
    if (!cuponmaniaEnabled && currentRole !== 'admin' && currentRole !== 'patrocinador') {
      if (activeView === 'marketplace' || activeView === 'wallet') {
        setActiveView('enlace_izcalli');
      }
    }
  }, [cuponmaniaEnabled, currentRole, activeView]);

  useEffect(() => {
    localStorage.setItem('cuponmania_view', activeView);
  }, [activeView]);

  const [authConfig, setAuthConfig] = useState({
    initialRole: 'usuario' as UserRole,
    initialIsRegister: false
  });

  const recordVisit = useCallback(async () => {
    // Evitar duplicados en la misma sesión/pestaña
    if (sessionStorage.getItem('cuponmania_visit_recorded')) return;

    try {
      const supabase = getSupabase();
      if (!supabase) return;

      sessionStorage.setItem('cuponmania_visit_recorded', 'true');
      console.info('Intentando registrar visita vía RPC...');
      const { error } = await supabase.rpc('increment_page_visits');
      
      if (error) {
        console.warn('RPC falló, intentando fallback manual:', error.message);
        // Fallback si el RPC no existe aún
        const { data } = await supabase
          .from('app_metrics')
          .select('count')
          .eq('id', 'page_visits')
          .maybeSingle();
        
        const rawCount = data?.count ? Number(data.count) : 0;
        // Restauración de las 109 visitas perdidas por reset anterior
        const baseCount = rawCount < 144 ? Math.max(rawCount + 109, 144) : rawCount;
        const newCount = baseCount + 1;
        const { error: upsertError } = await supabase
          .from('app_metrics')
          .upsert({ id: 'page_visits', count: newCount, updated_at: new Date().toISOString() });
        
        if (upsertError) {
          console.error('Error crítico al registrar visita (Fallback también falló):', upsertError.message);
        } else {
          console.info('Visita registrada correctamente (Fallback).');
          setPageVisits(newCount);
        }
      } else {
        console.info('Visita registrada correctamente vía RPC.');
        // Recargamos el valor fresco para el estado local
        const { data } = await supabase
          .from('app_metrics')
          .select('count')
          .eq('id', 'page_visits')
          .maybeSingle();
        if (data) {
          const rawCount = Number(data.count);
          // Restauración de las 109 visitas perdidas
          const correctedCount = rawCount < 144 ? Math.max(rawCount + 109, 144) : rawCount;
          setPageVisits(correctedCount);

          if (rawCount < 144) {
            await supabase
              .from('app_metrics')
              .upsert({ id: 'page_visits', count: correctedCount, updated_at: new Date().toISOString() });
          }
        }
      }
    } catch (e) {
      console.error('Error recording visit:', e);
    }
  }, []);

  useEffect(() => {
    recordVisit();
  }, [recordVisit]);

  useEffect(() => {
    localStorage.setItem('cuponmania_active_view', activeView);
    setIsSidebarOpen(false);
    
    // Si entramos a la cuponera, forzamos recarga para evitar desfases
    if (activeView === 'wallet' && currentUser) {
      fetchSavedCoupons();
    }
  }, [activeView, setIsSidebarOpen, currentUser?.id]);
  
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

  const existingCategories = useMemo(() => {
    return Array.from(new Set(activeCoupons.map(c => normalizeCategory(c.data.categoria))))
      .filter((c): c is string => !!c)
      .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  }, [activeCoupons]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [isFetchingSaved, setIsFetchingSaved] = useState(false);
  const [likedIds, setLikedIds] = useState<string[]>(() => {
    const stored = localStorage.getItem('cuponmania_liked');
    return stored ? JSON.parse(stored) : [];
  });

  const [savedFlyerIds, setSavedFlyerIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('izcalli_saved_flyers');
      return stored ? JSON.parse(stored) : [];
    } catch (_) {
      return [];
    }
  });

  const [likedFlyerIds, setLikedFlyerIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('izcalli_liked_flyers');
      return stored ? JSON.parse(stored) : [];
    } catch (_) {
      return [];
    }
  });

  const [isRegisteringBusiness, setIsRegisteringBusiness] = useState(false);
  const [registrationBusinessError, setRegistrationBusinessError] = useState('');
  const [pageVisits, setPageVisits] = useState(0);
  const [totalFlyers, setTotalFlyers] = useState(0);

  const fetchMetrics = useCallback(async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      // 1. Visitas
      const { data, error } = await supabase
        .from('app_metrics')
        .select('count')
        .eq('id', 'page_visits')
        .maybeSingle();
      
      if (!error && data) {
        const rawCount = Number(data.count);
        // Recuperación de las 109 visitas históricas perdidas por reset anterior
        const correctedCount = rawCount < 144 ? Math.max(rawCount + 109, 144) : rawCount;
        setPageVisits(correctedCount);

        if (rawCount < 144) {
          await supabase
            .from('app_metrics')
            .upsert({ id: 'page_visits', count: correctedCount, updated_at: new Date().toISOString() });
        }
      }

      // 2. Conteo de flyers (Patrocinadores) - Obtenemos la unión exacta de base de datos y local
      const uniqueFlyerIds = new Set<string>();
      
      const { data: dbFlyers, error: flyerError } = await supabase
        .from('izcalli_flyers')
        .select('id');
      
      if (!flyerError && dbFlyers) {
        dbFlyers.forEach(f => {
          if (f && f.id) uniqueFlyerIds.add(f.id);
        });
      }

      try {
        const localFlyersStr = localStorage.getItem('izcalli_flyers_local');
        if (localFlyersStr) {
          const locals = JSON.parse(localFlyersStr);
          if (Array.isArray(locals)) {
            locals.forEach((lf: any) => {
              if (lf && lf.id) {
                uniqueFlyerIds.add(lf.id);
              }
            });
          }
        }
      } catch (_) {}

      setTotalFlyers(uniqueFlyerIds.size);
    } catch (e) {
      console.error('Error fetching metrics:', e);
    }
  }, []);

  const adminMetrics: AdminMetrics = {
    totalUsers: users.filter(u => u.role === 'usuario' || (u.role !== 'admin' && u.role !== 'patrocinador')).length,
    totalSponsors: users.filter(u => u.role === 'patrocinador').length + totalFlyers + activeCoupons.length,
    totalAdmins: users.filter(u => u.role === 'admin').length,
    totalCoupons: activeCoupons.length,
    totalRevenue: (users.filter(u => u.role === 'patrocinador').length * 500) + (totalFlyers * 500),
    dailyActiveUsers: Math.floor(users.length * 0.4) + 1,
    pageVisits: pageVisits,
    totalFlyers: totalFlyers
  };

  useEffect(() => {
    if (activeView === 'admin_dashboard' && currentUser?.role === 'admin') {
      fetchMetrics();
      fetchProfiles();

      // Suscripción en tiempo real para las métricas
      const supabase = getSupabase();
      if (!supabase) return;
      const channel = supabase
        .channel('metrics_sync')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'app_metrics' 
        }, () => {
          fetchMetrics();
        })
        .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [activeView, currentUser, fetchMetrics]);

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
    website: '',
    target_enlace: 'izcalli'
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
          website: currentUser.website || '',
          target_enlace: 'izcalli'
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
      if (!supabase) return;
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
          target_enlace: dbCoupon.target_enlace || 'izcalli',
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
        setPublishedCoupons(prev => {
          // Mantener cupones que ya estaban en el estado (como los cargados por fetchSavedCoupons)
          // pero que no están en la lista general de publicados
          const generalIds = new Set(formatted.map(c => c.id));
          const extraCoupons = prev.filter(c => !generalIds.has(c.id));
          return [...formatted, ...extraCoupons];
        });
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
        // Primero asegurar que el usuario tiene un ID válido de Supabase si está logueado
        if (currentUser && !currentUser.id.includes('-')) {
          console.log('Detectado ID no-UUID, sincronizando perfil...');
          const synced = await upsertProfile(currentUser);
          if (synced && synced.id.includes('-')) {
            setCurrentUser(synced);
            localStorage.setItem('cuponmania_user', JSON.stringify(synced));
            // Actualizar referencia local para que los llamados concurrentes vean el nuevo ID
            currentUser.id = synced.id;
          }
        }

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
    
    // Si todavía no es UUID, intentamos una sincronización rápida
    let userId = currentUser.id;
    if (!userId.includes('-')) {
      const synced = await upsertProfile(currentUser);
      if (synced && synced.id.includes('-')) {
        userId = synced.id;
        setCurrentUser(synced);
      } else {
        console.warn('Cannot fetch saved coupons: User ID is not a UUID');
        return;
      }
    }

    setIsFetchingSaved(true);
    try {
      const supabase = getSupabase();
      if (!supabase) return;
      const { data, error } = await supabase
        .from('saved_coupons')
        .select('coupon_id')
        .eq('user_id', userId);
      
      if (error) throw error;
      if (data) {
        const ids = data.map(item => item.coupon_id);
        setSavedIds(ids);
        
        // Si hay IDs guardados que no están en la lista actual de cupones, los traemos por ID
        // Esto asegura que se vean en la cuponera aunque no estén publicados actualmente
        const missingIds = ids.filter(id => !publishedCoupons.some(c => c.id === id));
        if (missingIds.length > 0) {
          const { data: missingData, error: missingError } = await supabase
            .from('coupons')
            .select('*')
            .in('id', missingIds);
          
          if (!missingError && missingData) {
            const formattedMissing = missingData.map(dbCoupon => ({
              id: dbCoupon.id,
              creatorId: dbCoupon.creator_id,
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
            }));
            setPublishedCoupons(prev => {
              // Evitar duplicados por si acaso
              const existingIds = new Set(prev.map(c => c.id));
              const uniqueNew = formattedMissing.filter(c => !existingIds.has(c.id));
              return [...prev, ...uniqueNew];
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching saved coupons:', error);
    } finally {
      setIsFetchingSaved(false);
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
    if (role === 'usuario') setActiveView('enlace_izcalli');
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
        
        if (error) throw error;
        
        setSavedIds(prev => prev.filter(id => id !== couponId));
        showFeedback('Cupón eliminado de tu cuponera');
      } else {
        const { error } = await supabase
          .from('saved_coupons')
          .insert([{ user_id: userId, coupon_id: couponId }]);
        
        if (error) {
          // Si ya existe (por algún motivo de desincronización), lo manejamos como éxito
          if (error.code === '23505') {
            setSavedIds(prev => [...new Set([...prev, couponId])]);
            showFeedback('Este cupón ya estaba en tu cuponera');
          } else {
            throw error;
          }
        } else {
          setSavedIds(prev => [...prev, couponId]);
          showFeedback('¡Cupón guardado con éxito!', 'success');
        }
      }
    } catch (error: any) {
      console.error('Error saving coupon:', error);
      showFeedback(`No se pudo guardar: ${error.message || 'Error de conexión'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSaveFlyer = async (flyerId: string) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      showFeedback('Por favor, inicia sesión para guardar flyers en tu cuponera', 'error');
      return;
    }

    const isSaved = savedFlyerIds.includes(flyerId);
    let updated: string[];
    if (isSaved) {
      updated = savedFlyerIds.filter(id => id !== flyerId);
      showFeedback('Flyer removido de tu cuponera');
    } else {
      updated = [...savedFlyerIds, flyerId];
      showFeedback('¡Flyer guardado en tu cuponera con éxito!', 'success');
    }
    setSavedFlyerIds(updated);
    localStorage.setItem('izcalli_saved_flyers', JSON.stringify(updated));

    try {
      const supabase = getSupabase();
      if (supabase) {
        let userId = currentUser.id;
        if (!userId.includes('-')) {
          const synced = await upsertProfile(currentUser);
          if (synced && synced.id.includes('-')) {
            userId = synced.id;
          }
        }
        if (isSaved) {
          await supabase
            .from('izcalli_saved_flyers')
            .delete()
            .match({ user_id: userId, flyer_id: flyerId });
        } else {
          await supabase
            .from('izcalli_saved_flyers')
            .insert([{ user_id: userId, flyer_id: flyerId }]);
        }
      }
    } catch (err) {
      console.warn('Silent database write error for saved flyer:', err);
    }
  };

  const handleToggleLikeFlyer = async (flyerId: string) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      showFeedback('Por favor, inicia sesión para dar Me gusta a los flyers', 'error');
      return;
    }

    const isLiked = likedFlyerIds.includes(flyerId);
    let updated: string[];
    if (isLiked) {
      updated = likedFlyerIds.filter(id => id !== flyerId);
    } else {
      updated = [...likedFlyerIds, flyerId];
      showFeedback('¡Te gusta este flyer!');
    }
    setLikedFlyerIds(updated);
    localStorage.setItem('izcalli_liked_flyers', JSON.stringify(updated));

    try {
      const supabase = getSupabase();
      if (supabase) {
        let userId = currentUser.id;
        if (!userId.includes('-')) {
          const synced = await upsertProfile(currentUser);
          if (synced && synced.id.includes('-')) {
            userId = synced.id;
          }
        }
        if (isLiked) {
          await supabase
            .from('izcalli_liked_flyers')
            .delete()
            .match({ user_id: userId, flyer_id: flyerId });
        } else {
          await supabase
            .from('izcalli_liked_flyers')
            .insert([{ user_id: userId, flyer_id: flyerId }]);
        }
      }
    } catch (err) {
      console.warn('Silent database write error for liked flyer:', err);
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
        image_data: imageData,
        target_enlace: formData.target_enlace || 'izcalli'
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
        // Usamos un pequeño delay para asegurar que el estado se actualizó y no mostramos error previo
        setTimeout(() => {
          showFeedback('¡Cupón generado con éxito!', 'success');
        }, 100);
      } else {
        throw new Error('La respuesta de la IA llegó vacía o es inválida');
      }
    } catch (error: any) {
      console.error("Error generating coupon:", error);
      // Solo mostramos el error si el cupón sigue siendo nulo (para evitar el doble mensaje si uno falló pero el otro entró)
      showFeedback(`No se pudo generar el cupón: ${error.message || 'Error de conexión con la IA'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderGeneratorForm = () => {
    const sponsorCouponsCount = activeCoupons.filter(c => c.sponsorId === currentUser?.id).length;
    
    return (
      <div className="p-8 flex flex-col gap-8 flex-1">
        <header className="mb-2 border-b border-black/5 pb-6">
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase mb-4 leading-none italic">GENERA TU CUPÓN CON IA</h2>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-1.5 bg-[#F57C00]" />
              <p className="text-black/40 font-bold uppercase text-[10px] tracking-widest">Generar nueva oferta hoy</p>
            </div>
            <div className="px-5 py-2 bg-black text-white rounded-2xl shrink-0">
               <div className="text-[10px] font-black flex flex-col items-center leading-tight">
                 <span>{sponsorCouponsCount}</span>
                 <span className="text-[7px] text-white/50 uppercase tracking-widest">Totales</span>
               </div>
            </div>
          </div>
        </header>

        <section className="pt-2">
      
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

            {/* Target Enlace Selector for Admin and Patrocinador */}
            {(currentUser?.role === 'admin' || currentUser?.role === 'patrocinador') && (
              <div className="space-y-2">
                <label className="text-[11px] uppercase text-black/50 tracking-[0.1em] font-black flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-primary" /> Segmentación de Cupón (Destino)
                </label>
                <select 
                  value={formData.target_enlace || 'izcalli'} 
                  onChange={e => setFormData({...formData, target_enlace: e.target.value as 'izcalli'})}
                  className="w-full bg-gray-50 border border-black/5 rounded-2xl p-4 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                >
                  <option value="izcalli">Enlace Izcalli 🏙️</option>
                </select>
              </div>
            )}

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
  };

  const renderSidebar = () => {
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
              
              {!currentUser ? (
                <>
                  <button onClick={() => setActiveView('enlace_izcalli')} className={navItemClasses('enlace_izcalli')}>
                     <Megaphone className="w-5 h-5" /> <span>Enlace Izcalli</span>
                  </button>

                  {cuponmaniaEnabled && (
                    <button onClick={() => setActiveView('marketplace')} className={navItemClasses('marketplace')}>
                       <LayoutGrid className="w-5 h-5" /> <span>Cuponmanía Izcalli</span>
                    </button>
                  )}

                  <button onClick={() => setActiveView('landing')} className={navItemClasses('landing')}>
                     <Home className="w-5 h-5" /> <span>Promociona tu negocio</span>
                  </button>
                </>
              ) : currentRole === 'admin' ? (
                <>
                  <button onClick={() => setActiveView('admin_dashboard')} className={navItemClasses('admin_dashboard')}>
                     <LayoutDashboard className="w-5 h-5" /> <span>Métricas</span>
                  </button>
                  <button onClick={() => setActiveView('enlace_izcalli')} className={navItemClasses('enlace_izcalli')}>
                     <Megaphone className="w-5 h-5" /> <span>Enlace Izcalli</span>
                  </button>
                  <button onClick={() => setActiveView('marketplace')} className={navItemClasses('marketplace')}>
                     <LayoutGrid className="w-5 h-5" /> <span>Cuponmanía Izcalli</span>
                  </button>
                  <button onClick={() => setActiveView('landing')} className={navItemClasses('landing')}>
                     <Home className="w-5 h-5" /> <span>Promociona tu negocio</span>
                  </button>
                  <button onClick={() => setActiveView('generator')} className={navItemClasses('generator')}>
                     <Sparkles className="w-5 h-5" /> <span>Generador de cupones</span>
                  </button>
                  <button onClick={() => setActiveView('coupon_counter')} className={navItemClasses('coupon_counter')}>
                     <QrCode className="w-5 h-5" /> <span>Contador</span>
                  </button>
                </>
              ) : currentRole === 'usuario' ? (
                <>
                  <button onClick={() => setActiveView('enlace_izcalli')} className={navItemClasses('enlace_izcalli')}>
                     <Megaphone className="w-5 h-5" /> <span>Enlace Izcalli</span>
                  </button>

                  {cuponmaniaEnabled && (
                    <button onClick={() => setActiveView('marketplace')} className={navItemClasses('marketplace')}>
                       <LayoutGrid className="w-5 h-5" /> <span>Cuponmanía Izcalli</span>
                    </button>
                  )}

                  <button onClick={() => setActiveView('wallet')} className={navItemClasses('wallet')}>
                     <Ticket className="w-5 h-5" /> <span>Mi Cuponera</span>
                  </button>

                  <button onClick={() => setActiveView('landing')} className={navItemClasses('landing')}>
                     <Home className="w-5 h-5" /> <span>Promociona tu negocio</span>
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setActiveView('landing')} className={navItemClasses('landing')}>
                     <Home className="w-5 h-5" /> <span>Promociona tu negocio</span>
                  </button>

                  <button onClick={() => setActiveView('enlace_izcalli')} className={navItemClasses('enlace_izcalli')}>
                     <Megaphone className="w-5 h-5" /> <span>Enlace Izcalli</span>
                  </button>

                  {(cuponmaniaEnabled || currentRole === 'patrocinador') && (
                    <button onClick={() => setActiveView('marketplace')} className={navItemClasses('marketplace')}>
                       <LayoutGrid className="w-5 h-5" /> <span>Cuponmanía Izcalli</span>
                    </button>
                  )}

                  <button onClick={() => setActiveView('wallet')} className={navItemClasses('wallet')}>
                     <Ticket className="w-5 h-5" /> <span>{currentRole === 'patrocinador' ? 'Mis Cupones' : 'Mi Cuponera'}</span>
                  </button>

                  {(currentUser?.role === 'patrocinador') && (
                    <>
                      <button onClick={() => setActiveView('generator')} className={navItemClasses('generator')}>
                        <Sparkles className="w-5 h-5" /> <span>Generador de cupones</span>
                      </button>
                      <button onClick={() => setActiveView('coupon_counter')} className={navItemClasses('coupon_counter')}>
                        <QrCode className="w-5 h-5" /> <span>Contador</span>
                      </button>
                    </>
                  )}
                </>
              )}

              <div className="h-px bg-black/5 my-6 mx-2" />
              <div className="text-[10px] font-black tracking-[0.2em] text-black/20 ml-2 mb-4 uppercase">CUENTA</div>
              
              <button onClick={() => setActiveView('profile')} className={navItemClasses('profile')}>
                 <User className="w-5 h-5" /> <span>{currentUser ? 'Mi Perfil' : 'Iniciar Sesión'}</span>
              </button>

              {currentUser && (
                <button onClick={() => setActiveView('notifications')} className={navItemClasses('notifications')}>
                   <div className="relative">
                     <Bell className="w-5 h-5" />
                     {unreadCount > 0 && <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />}
                   </div>
                   <span>Notificaciones</span>
                </button>
              )}

              <button onClick={() => setActiveView('privacy')} className={navItemClasses('privacy')}>
                 <ShieldCheck className="w-5 h-5" /> <span>Privacidad</span>
              </button>

              {currentRole === 'admin' && (
                <>
                  <div className="h-px bg-black/5 my-6 mx-2" />
                  <div className="text-[10px] font-black tracking-[0.2em] text-black/20 ml-2 mb-4 uppercase">SISTEMA</div>
                  
                  <button onClick={() => setActiveView('admin_users')} className={navItemClasses('admin_users')}>
                     <User className="w-5 h-5" /> <span>Usuarios</span>
                  </button>
                  <button onClick={() => setActiveView('admin_flyer')} className={navItemClasses('admin_flyer')}>
                     <Palette className="w-5 h-5" /> <span>Flyers Publi</span>
                  </button>
                </>
              )}

              <div className="pt-10 space-y-3">
                <button 
                  onClick={handleInstallClick}
                  className="w-full flex items-center gap-4 px-6 py-5 rounded-[24px] text-[11px] font-black uppercase tracking-widest bg-gradient-to-r from-emerald-500 to-teal-650 hover:from-emerald-600 hover:to-teal-600 text-white shadow-xl shadow-teal-500/15 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  <Download className="w-5 h-5 animate-pulse" /> <span>Instalar App</span>
                </button>

                {currentUser && (
                  <button onClick={handleLogout} className="w-full flex items-center gap-4 px-6 py-5 rounded-[24px] text-[11px] font-black uppercase tracking-widest text-red-500/40 hover:text-red-500 hover:bg-red-50 transition-all">
                     <RefreshCw className="w-5 h-5" /> <span>Cerrar Sesión</span>
                  </button>
                )}
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
      case 'landing':
        return (
          <LandingPageView 
            onJoin={() => {}} 
            onExplore={() => setActiveView('marketplace')} 
            onShowPrivacy={() => setActiveView('privacy')}
            registrationForm={
              <BusinessRegistrationForm 
                loading={isRegisteringBusiness}
                error={registrationBusinessError}
                onShowPrivacy={() => setActiveView('privacy')}
                onSubmit={async (data) => {
                  if (!data.acceptPrivacy) {
                    setRegistrationBusinessError('Debes aceptar el aviso de privacidad');
                    return;
                  }
                  setIsRegisteringBusiness(true);
                  setRegistrationBusinessError('');
                  
                  if (data.password !== data.confirmPassword) {
                    setRegistrationBusinessError('Las contraseñas no coinciden');
                    setIsRegisteringBusiness(false);
                    return;
                  }

                  const newUser: UserProfile = {
                    id: crypto.randomUUID(),
                    role: 'patrocinador',
                    name: data.representativeName,
                    username: data.username,
                    email: data.email,
                    whatsapp: data.whatsapp,
                    website: data.website,
                    businessName: data.businessName,
                    representativeName: data.representativeName,
                    address: data.address,
                    locationLink: data.locationLink,
                    services: data.services,
                    photo: data.photo,
                    isActive: true,
                    createdAt: new Date().toISOString()
                  };

                  try {
                    const saved = await upsertProfile(newUser, true);
                    if (saved) {
                      setCurrentUser(saved);
                      setCurrentRole('patrocinador');
                      setActiveView('generator');
                      showFeedback(`¡Bienvenido ${saved.businessName}!`);
                    }
                  } catch (err: any) {
                    setRegistrationBusinessError(err.message || 'Error al registrar');
                  } finally {
                    setIsRegisteringBusiness(false);
                  }
                }}
              />
            }
          />
        );
      case 'notifications':
        return (
          <section className="flex-1 bg-gray-50 p-6 md:p-12 pb-32">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-4 leading-none">Notificaciones</h2>
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
      case 'marketplace': 
        return (
          <div className="relative w-full h-full min-h-[calc(100vh-80px)]">
            <MarketplaceView coupons={activeCoupons} savedIds={savedIds} likedIds={likedIds} onSave={handleSaveCoupon} onLike={handleLikeCoupon} onShowFlyer={() => setIsFlyerFullscreen(true)} flyerLink={flyerLinks.flyer1} users={users} onShowSponsor={(s) => setViewingSponsor(s)} isLoading={isFetchingCoupons} isAdmin={currentRole === 'admin'} onDelete={handleDeleteCoupon} showFeedback={showFeedback} zoneFilter="izcalli" />
            
            {!cuponmaniaEnabled && currentRole !== 'admin' && currentRole !== 'patrocinador' && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/20 backdrop-blur-md pointer-events-auto">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="bg-white/40 backdrop-blur-2xl p-8 md:p-14 rounded-[30px] md:rounded-[60px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] border border-white/40 text-center w-full max-w-[90%] md:max-w-lg transform transition-all"
                >
                  <div className="w-20 h-20 md:w-28 md:h-28 bg-primary/20 rounded-[24px] md:rounded-[40px] flex items-center justify-center mx-auto mb-6 md:mb-10 text-primary animate-pulse shadow-inner">
                    <Calendar className="w-10 h-10 md:w-14 md:h-14" />
                  </div>
                  
                  <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase mb-4 md:mb-6 leading-none text-black drop-shadow-sm">
                    Próximamente
                  </h2>
                  
                  <div className="w-12 md:w-20 h-1.5 md:h-2 bg-primary mx-auto mb-6 md:mb-10 rounded-full" />
                  
                  <p className="text-sm md:text-lg font-bold uppercase tracking-[0.15em] md:tracking-[0.25em] text-black/70 mb-8 md:mb-12 leading-relaxed max-w-sm mx-auto">
                    Estamos preparando la mayor red de beneficios. <br/>
                    <span className="text-primary font-black block mt-2 text-xl">Disponible en Junio 2026.</span>
                  </p>
                  
                  <button 
                    onClick={() => setActiveView('landing')}
                    className="mb-10 px-12 py-5 bg-primary text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-secondary transition-all active:scale-95 shadow-2xl shadow-primary/20 flex items-center justify-center gap-3 mx-auto"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Regresar al Inicio
                  </button>
                  
                  <div className="flex items-center justify-center gap-3 md:gap-5">
                    <span className="w-2.5 h-2.5 md:w-4 md:h-4 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2.5 h-2.5 md:w-4 md:h-4 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2.5 h-2.5 md:w-4 md:h-4 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        );
      case 'cuponmania_tlalnepantla': 
        return (
          <div className="relative w-full h-full min-h-[calc(100vh-80px)]">
            <MarketplaceView coupons={activeCoupons} savedIds={savedIds} likedIds={likedIds} onSave={handleSaveCoupon} onLike={handleLikeCoupon} onShowFlyer={() => setIsFlyerFullscreen(true)} flyerLink={flyerLinks.flyer2} users={users} onShowSponsor={(s) => setViewingSponsor(s)} isLoading={isFetchingCoupons} isAdmin={currentRole === 'admin'} onDelete={handleDeleteCoupon} showFeedback={showFeedback} zoneFilter="tlalnepantla" />
            
            {!cuponmaniaEnabled && currentRole !== 'admin' && currentRole !== 'patrocinador' && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/20 backdrop-blur-md pointer-events-auto">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="bg-white/40 backdrop-blur-2xl p-8 md:p-14 rounded-[30px] md:rounded-[60px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] border border-white/40 text-center w-full max-w-[90%] md:max-w-lg transform transition-all"
                >
                  <div className="w-20 h-20 md:w-28 md:h-28 bg-primary/20 rounded-[24px] md:rounded-[40px] flex items-center justify-center mx-auto mb-6 md:mb-10 text-primary animate-pulse shadow-inner">
                    <Calendar className="w-10 h-10 md:w-14 md:h-14" />
                  </div>
                  
                  <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase mb-4 md:mb-6 leading-none text-black drop-shadow-sm">
                    Próximamente
                  </h2>
                  
                  <div className="w-12 md:w-20 h-1.5 md:h-2 bg-primary mx-auto mb-6 md:mb-10 rounded-full" />
                  
                  <p className="text-sm md:text-lg font-bold uppercase tracking-[0.15em] md:tracking-[0.25em] text-black/70 mb-8 md:mb-12 leading-relaxed max-w-sm mx-auto">
                    Estamos preparando la mayor red de beneficios. <br/>
                    <span className="text-primary font-black block mt-2 text-xl">Disponible en Junio 2026.</span>
                  </p>
                  
                  <button 
                    onClick={() => setActiveView('landing')}
                    className="mb-10 px-12 py-5 bg-primary text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-secondary transition-all active:scale-95 shadow-2xl shadow-primary/20 flex items-center justify-center gap-3 mx-auto"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Regresar al Inicio
                  </button>
                  
                  <div className="flex items-center justify-center gap-3 md:gap-5">
                    <span className="w-2.5 h-2.5 md:w-4 md:h-4 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2.5 h-2.5 md:w-4 md:h-4 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2.5 h-2.5 md:w-4 md:h-4 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        );
      case 'coupon_counter': return <CouponCounterView currentUser={currentUser!} coupons={activeCoupons} showFeedback={showFeedback} />;
      case 'wallet': 
        if (!cuponmaniaEnabled && currentRole !== 'admin' && currentRole !== 'patrocinador') {
          return (
            <div className="relative w-full h-full min-h-[calc(100vh-80px)] flex items-center justify-center p-4">
              <div className="text-center bg-white p-8 md:p-12 rounded-[32px] border border-black/5 max-w-md w-full">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-primary">
                  <Calendar className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tight mb-2">Cuponera Digital</h3>
                <p className="text-xs text-black/40 font-bold uppercase tracking-widest leading-relaxed mb-6">
                  El sistema de cupones estará disponible para todos en Junio 2026.
                </p>
                <button 
                  onClick={() => setActiveView('landing')}
                  className="px-8 py-3 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all active:scale-95"
                >
                  Regresar al Inicio
                </button>
              </div>
            </div>
          );
        }
        return currentUser?.role === 'patrocinador' 
          ? <SponsorDashboard coupons={activeCoupons} onTogglePublish={togglePublishStatus} onDelete={handleDeleteCoupon} /> 
          : <WalletView 
              coupons={activeCoupons} 
              savedIds={savedIds} 
              likedIds={likedIds} 
              onSave={handleSaveCoupon} 
              onLike={handleLikeCoupon} 
              users={users} 
              onShowSponsor={(s) => setViewingSponsor(s)} 
              isLoading={isFetchingSaved || isFetchingCoupons} 
              showFeedback={showFeedback}
              savedFlyerIds={savedFlyerIds}
              likedFlyerIds={likedFlyerIds}
              onToggleSaveFlyer={handleToggleSaveFlyer}
              onToggleLikeFlyer={handleToggleLikeFlyer}
            />;
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
              <div className="w-full md:w-[450px] shrink-0 flex flex-col gap-6">
                <div className="bg-white rounded-[32px] shadow-xl overflow-hidden border border-black/5">
                  {renderGeneratorForm()}
                </div>

                {/* INSTRUCCIONES ESTILO PASO A PASO PARA EL PATROCINADOR */}
                <div className="bg-white rounded-[32px] shadow-lg border border-black/5 p-8">
                  <h3 className="text-xs font-black uppercase tracking-wider text-secondary mb-5 flex items-center gap-2 border-b border-black/5 pb-3">
                    <HelpCircle className="w-4 h-4 text-[#008F9A]" />
                    Guía Rápida para Patrocinadores 🏪
                  </h3>
                  <ol className="space-y-4 text-xs font-medium text-neutral-600">
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-[#008F9A]/10 text-[#008F9A] font-black rounded-lg flex items-center justify-center text-[10px]">1</span>
                      <p className="leading-relaxed">
                        <strong className="text-black block mb-0.5">Sube tu logo comercial:</strong>
                        Selecciona una imagen clara de tu negocio. Se mostrará en la parte superior del cupón.
                      </p>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-[#008F9A]/10 text-[#008F9A] font-black rounded-lg flex items-center justify-center text-[10px]">2</span>
                      <p className="leading-relaxed">
                        <strong className="text-black block mb-0.5">Comenta los Detalles de la Oferta:</strong>
                        Escribe el beneficio (ej. "2x1 en desayunos") y define las condiciones de uso (ej. "Válido lun-vie").
                      </p>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-[#008F9A]/10 text-[#008F9A] font-black rounded-lg flex items-center justify-center text-[10px]">3</span>
                      <p className="leading-relaxed">
                        <strong className="text-black block mb-0.5">Define la Vigencia:</strong>
                        Especifica el número de horas disponibles para canjear antes de que expire la oferta.
                      </p>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-[#008F9A]/10 text-[#008F9A] font-black rounded-lg flex items-center justify-center text-[10px]">4</span>
                      <p className="leading-relaxed">
                        <strong className="text-black block mb-0.5">Previsualiza y Publica:</strong>
                        Revisa el diseño generado en tiempo real en la pantalla y haz clic en "Publicar" para activarlo en la sección de Cupones.
                      </p>
                    </li>
                  </ol>
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
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-4 leading-none">Panel de Control</h2>
            <AdminMetricsView metrics={adminMetrics} />

            {/* Control de Módulo Cuponmanía */}
            <div className="mt-8 p-6 bg-white rounded-[32px] border border-black/5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-2xl shrink-0 transition-all ${cuponmaniaEnabled ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                  <Ticket className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-gray-900">Módulo Cuponmanía</h3>
                  <p className="text-xs text-black/40 font-bold uppercase tracking-widest leading-none mt-1">
                    Estado actual: <span className={cuponmaniaEnabled ? 'text-green-600 font-extrabold' : 'text-red-600 font-extrabold'}>{cuponmaniaEnabled ? 'ACTIVO (PÚBLICO)' : 'DESACTIVADO (OCULTO PARA USUARIOS)'}</span>
                  </p>
                  <p className="text-[10px] text-black/50 font-medium leading-relaxed mt-2 max-w-xl">
                    {cuponmaniaEnabled 
                      ? 'Los visitantes pueden ver, buscar, y guardar cupones en el catálogo. Los patrocinadores pueden crearlos.' 
                      : 'El catálogo y la billetera están deshabilitados con el cartel de lanzamiento en Junio para todo público. Los ADMINISTRADORES y PATROCINADORES pueden seguir viéndolos para validación.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => updateCuponmaniaSettings(!cuponmaniaEnabled)}
                className={`w-full md:w-auto px-8 py-4 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                  cuponmaniaEnabled 
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/15' 
                    : 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/15'
                }`}
              >
                {cuponmaniaEnabled ? 'Desactivar Módulo' : 'Activar Módulo'}
              </button>
            </div>

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
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-4 leading-none">Gestión de Cuentas</h2>
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
      case 'enlace_izcalli':
        return (
          <EnlaceIzcalliView 
            currentUser={currentUser} 
            showFeedback={showFeedback} 
            savedFlyerIds={savedFlyerIds}
            likedFlyerIds={likedFlyerIds}
            onToggleSaveFlyer={handleToggleSaveFlyer}
            onToggleLikeFlyer={handleToggleLikeFlyer}
            enlaceType="izcalli"
          />
        );
      case 'enlace_tlalnepantla':
        return (
          <EnlaceIzcalliView 
            currentUser={currentUser} 
            showFeedback={showFeedback} 
            savedFlyerIds={savedFlyerIds}
            likedFlyerIds={likedFlyerIds}
            onToggleSaveFlyer={handleToggleSaveFlyer}
            onToggleLikeFlyer={handleToggleLikeFlyer}
            enlaceType="tlalnepantla"
          />
        );
      case 'privacy':
        return <PrivacyPolicy onBack={() => setActiveView('landing')} />;
    }
  };

  if (!currentUser && activeView !== 'landing' && activeView !== 'privacy' && activeView !== 'marketplace' && activeView !== 'enlace_izcalli') {
    return <AuthView 
      upsertProfile={upsertProfile}
      onShowPrivacy={() => setActiveView('privacy')}
      onAuth={(userProfile) => {
        setCurrentUser(userProfile);
        setCurrentRole(userProfile.role);
        setIsAuthModalOpen(false);
        fetchProfiles(); // Sincronizar lista de usuarios inmediatamente
        resetAllForms(userProfile);
        if (userProfile.role === 'admin') setActiveView('admin_dashboard');
        else if (userProfile.role === 'patrocinador') setActiveView('generator');
        else setActiveView('enlace_izcalli');
        showFeedback(`Bienvenido, ${userProfile.name}`);
      }} 
      users={users} 
      onBack={() => {
        setAuthConfig({ initialRole: 'usuario', initialIsRegister: false });
        setActiveView('landing');
      }}
      initialRole={authConfig.initialRole}
      initialIsRegister={authConfig.initialIsRegister}
    />;
  }

  return (
    <div className="h-screen bg-white text-black font-sans flex flex-col antialiased overflow-hidden">
      
      <AnimatePresence>
        {activeAlert && (
          <motion.div 
            initial={{ opacity: 0, y: -100, x: '-50%' }}
            animate={{ opacity: 1, y: 30, x: '-50%' }}
            exit={{ opacity: 0, y: -100, x: '-50%' }}
            className="fixed top-0 left-1/2 z-[3000] w-[90%] max-w-md"
          >
            <div className="bg-secondary text-white rounded-[32px] p-8 shadow-[0_40px_80px_rgba(245,124,0,0.4)] border border-white/20 relative overflow-hidden group">
              {/* Shimmer/Pulse effect */}
              <motion.div 
                animate={{ opacity: [0.1, 0.3, 0.1], scale: [1, 1.2, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute -top-1/2 -right-1/2 w-full h-full bg-white rounded-full blur-3xl pointer-events-none"
              />
              
              <div className="relative z-10 flex items-start gap-6">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 animate-pulse">
                  <Bell className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xl font-black uppercase tracking-tighter leading-none mb-2">{activeAlert.title}</h4>
                  <p className="text-xs font-bold text-white/80 leading-relaxed uppercase tracking-wider">{activeAlert.message}</p>
                </div>
                <button 
                  onClick={() => setActiveAlert(null)}
                  className="p-3 hover:bg-white/10 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Progress bar for auto-hide */}
              <motion.div 
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 10, ease: 'linear' }}
                className="absolute bottom-0 left-0 h-1.5 bg-white/30"
              />
            </div>
          </motion.div>
        )}
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
                onShowPrivacy={() => {
                  setActiveView('privacy');
                  setIsAuthModalOpen(false);
                }}
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
          
          <button 
            onClick={() => {
              if (currentUser?.role === 'admin') {
                setActiveView('admin_dashboard');
              } else if (currentUser?.role === 'patrocinador') {
                setActiveView('generator');
              } else {
                setActiveView('enlace_izcalli');
              }
            }}
            className="h-14 md:h-24 flex items-center py-2 gap-2 md:gap-3 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <img src="https://cossma.com.mx/cuponmania.png" alt="Cuponmanía Logo" className="h-full w-auto object-contain" />
            <span className="text-lg md:text-2xl font-black uppercase tracking-tighter italic whitespace-nowrap">Cuponmanía</span>
          </button>
        </div>

        <div className="flex items-center gap-4">
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => setActiveView('admin_dashboard')}
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-[10.5px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-md shadow-orange-500/20 cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Panel Control</span>
            </button>
          )}
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
          {currentUser?.role === 'admin' && (
            <div className="bg-amber-50 border-b border-amber-200/60 p-4 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm z-[90]">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${cuponmaniaEnabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  <Ticket className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <p className="text-[12px] font-black uppercase tracking-tight text-gray-900">
                    Control Administrativo del Módulo Cuponmanía
                  </p>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-none mt-1">
                    Estado: <span className={cuponmaniaEnabled ? 'text-green-600 font-extrabold' : 'text-red-500 font-extrabold'}>{cuponmaniaEnabled ? '✅ ACTIVO (PÚBLICO)' : '❌ DESACTIVADO (OCULTO PARA PÚBLICO)'}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setActiveView('admin_dashboard')}
                  className="flex-1 sm:flex-initial px-4 py-2 bg-black text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-800 transition-all text-center cursor-pointer"
                >
                  Ir al Panel
                </button>
                <button
                  onClick={() => updateCuponmaniaSettings(!cuponmaniaEnabled)}
                  className={`flex-1 sm:flex-initial px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl text-white transition-all shadow-sm cursor-pointer ${
                    cuponmaniaEnabled 
                      ? 'bg-red-600 hover:bg-red-700 shadow-red-600/10' 
                      : 'bg-green-600 hover:bg-green-700 shadow-green-600/10'
                  }`}
                >
                  {cuponmaniaEnabled ? 'Desactivar Módulo' : 'Activar Módulo'}
                </button>
              </div>
            </div>
          )}
          <div className="flex-1">
            {renderMainContent()}
          </div>
        </section>

      </main>
      
      {/* Mobile Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-secondary border-t border-white/10 flex items-center justify-around px-1 z-[1000] shadow-[0_-10px_40px_rgba(0,0,0,0.3)] text-white">
        
        {/* Dynamic Navigation for Admin */}
        {currentUser?.role === 'admin' && (
          <>
            <button onClick={() => setActiveView('admin_dashboard')} className={`flex flex-col items-center gap-1 transition-all ${activeView === 'admin_dashboard' ? 'text-white scale-110' : 'text-white/40'}`}>
              <LayoutDashboard className="w-5 h-5" />
              <span className="text-[6.5px] font-black uppercase">Admin</span>
            </button>
            <button onClick={() => { setActiveView('generator'); setCoupon(null); }} className={`flex flex-col items-center gap-1 transition-all ${activeView === 'generator' ? 'text-white scale-110' : 'text-white/40'}`}>
              <Ticket className="w-5 h-5" />
              <span className="text-[6.5px] font-black uppercase">Crear</span>
            </button>
            <button onClick={() => setActiveView('enlace_izcalli')} className={`flex flex-col items-center gap-1 transition-all ${activeView === 'enlace_izcalli' ? 'text-white scale-110' : 'text-white/40'}`}>
              <Megaphone className="w-5 h-5" />
              <span className="text-[6.5px] font-black uppercase">Izcalli</span>
            </button>
            <button onClick={() => setActiveView('marketplace')} className={`flex flex-col items-center gap-1 transition-all ${activeView === 'marketplace' ? 'text-white scale-110' : 'text-white/40'}`}>
              <LayoutGrid className="w-5 h-5" />
              <span className="text-[6.5px] font-black uppercase">Cup Izcalli</span>
            </button>
          </>
        )}
 
        {/* Dynamic Navigation for Patrocinador */}
        {currentUser?.role === 'patrocinador' && (
          <>
            <button onClick={() => { setActiveView('generator'); setCoupon(null); }} className={`flex flex-col items-center gap-1 transition-all ${activeView === 'generator' ? 'text-white scale-110' : 'text-white/40'}`}>
              <Ticket className="w-5 h-5" />
              <span className="text-[6.5px] font-black uppercase">Crear</span>
            </button>
            <button onClick={() => setActiveView('enlace_izcalli')} className={`flex flex-col items-center gap-1 transition-all ${activeView === 'enlace_izcalli' ? 'text-white scale-110' : 'text-white/40'}`}>
              <Megaphone className="w-5 h-5" />
              <span className="text-[6.5px] font-black uppercase">Izcalli</span>
            </button>
            {(cuponmaniaEnabled || currentRole === 'patrocinador') && (
              <button onClick={() => setActiveView('marketplace')} className={`flex flex-col items-center gap-1 transition-all ${activeView === 'marketplace' ? 'text-white scale-110' : 'text-white/40'}`}>
                <LayoutGrid className="w-5 h-5" />
                <span className="text-[6.5px] font-black uppercase">Cup Izcalli</span>
              </button>
            )}
          </>
        )}
 
        {/* Dynamic Navigation for Guest / Standard Registered User */}
        {(!currentUser || currentUser?.role === 'usuario') && (
          <>
            <button onClick={() => setActiveView('enlace_izcalli')} className={`flex flex-col items-center gap-1 transition-all ${activeView === 'enlace_izcalli' ? 'text-white scale-110' : 'text-white/40'}`}>
              <Megaphone className="w-5 h-5" />
              <span className="text-[6.5px] font-black uppercase">Izcalli</span>
            </button>
            {cuponmaniaEnabled && (
              <button onClick={() => setActiveView('marketplace')} className={`flex flex-col items-center gap-1 transition-all ${activeView === 'marketplace' ? 'text-white scale-110' : 'text-white/40'}`}>
                <LayoutGrid className="w-5 h-5" />
                <span className="text-[6.5px] font-black uppercase">Cup Izcalli</span>
              </button>
            )}
          </>
        )}
 
        {/* Standard User / Notifications Access and Logout Option */}
        <button onClick={() => setActiveView('profile')} className={`flex flex-col items-center gap-1 transition-all ${activeView === 'profile' ? 'text-white scale-110' : 'text-white/40'}`}>
          <User className="w-5 h-5" />
          <span className="text-[6.5px] font-black uppercase">{currentUser ? 'Perfil' : 'Acceso'}</span>
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

      {/* Modal de Instrucciones de Instalación de App (PWA) */}
      <AnimatePresence>
        {showInstallModal && (
          <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInstallModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              className="relative w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl border border-black/5 z-10 flex flex-col text-gray-800"
            >
              {/* Header con gradiente */}
              <div className="p-5 bg-gradient-to-br from-teal-950 to-emerald-950 text-white flex flex-col items-center text-center relative border-b border-white/5">
                <button
                  onClick={() => setShowInstallModal(false)}
                  className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white/80 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                <div className="w-12 h-12 bg-teal-500/20 border border-teal-500/30 rounded-2xl flex items-center justify-center text-teal-400 mb-2.5 shadow-inner">
                  <Smartphone className="w-7 h-7" />
                </div>

                <h3 className="text-base md:text-lg font-black uppercase tracking-tight">Instalar Cuponmanía</h3>
                <p className="text-[9px] md:text-[10px] text-emerald-400 uppercase tracking-widest font-bold mt-0.5">Disfruta la app en tu móvil u ordenador</p>
              </div>

              {/* Tabs para seleccionar plataforma */}
              <div className="grid grid-cols-2 border-b border-gray-100 bg-gray-50/50 p-1">
                <button
                  onClick={() => setInstallTab('android')}
                  className={`py-2 text-[9px] md:text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    installTab === 'android'
                      ? 'bg-white text-teal-950 shadow-sm'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Android o PC</span>
                </button>
                <button
                  onClick={() => setInstallTab('ios')}
                  className={`py-2 text-[9px] md:text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    installTab === 'ios'
                      ? 'bg-white text-teal-950 shadow-sm'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>iPhone / iPad</span>
                </button>
              </div>

              {/* Contenido / Pasos */}
              <div className="p-5 space-y-4">
                {installTab === 'android' ? (
                  <div className="space-y-3">
                    <p className="text-[11px] text-gray-500 font-medium text-center leading-relaxed">
                      Sigue estos simples pasos para instalar en Android, Chrome u otros navegadores:
                    </p>
                    
                    <div className="space-y-2.5">
                      <div className="flex items-start gap-2.5 bg-gray-50 p-2.5 rounded-xl border border-black/5">
                        <span className="flex-shrink-0 w-5.5 h-5.5 rounded-lg bg-teal-100 text-teal-700 text-[11px] font-black flex items-center justify-center">1</span>
                        <p className="text-[10.5px] text-gray-700 font-semibold leading-relaxed">
                          Toca el botón con los <span className="font-extrabold uppercase tracking-widest text-[8.5px]">3 puntos ⋮</span> del navegador.
                        </p>
                      </div>

                      <div className="flex items-start gap-2.5 bg-gray-50 p-2.5 rounded-xl border border-black/5">
                        <span className="flex-shrink-0 w-5.5 h-5.5 rounded-lg bg-teal-100 text-teal-700 text-[11px] font-black flex items-center justify-center">2</span>
                        <p className="text-[10.5px] text-gray-700 font-semibold leading-relaxed">
                          Selecciona <span className="text-teal-700 font-black uppercase tracking-wide">"Instalar aplicación"</span> o <span className="text-teal-700 font-black uppercase tracking-wide">"Instalar app"</span>.
                        </p>
                      </div>

                      <div className="flex items-start gap-2.5 bg-gray-50 p-2.5 rounded-xl border border-black/5">
                        <span className="flex-shrink-0 w-5.5 h-5.5 rounded-lg bg-teal-100 text-teal-700 text-[11px] font-black flex items-center justify-center">3</span>
                        <p className="text-[10.5px] text-gray-700 font-semibold leading-relaxed">
                          Confirma en <span className="font-extrabold uppercase text-teal-700">"Instalar"</span> para tener el icono de la App directa.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-[11px] text-gray-500 font-medium text-center leading-relaxed">
                      En iOS (iPhone/iPad), puedes añadirlo manualmente a tu pantalla desde el navegador Safari:
                    </p>

                    <div className="space-y-2.5">
                      <div className="flex items-start gap-2.5 bg-gray-50 p-2.5 rounded-xl border border-black/5">
                        <span className="flex-shrink-0 w-5.5 h-5.5 rounded-lg bg-emerald-100 text-emerald-700 text-[11px] font-black flex items-center justify-center">1</span>
                        <p className="text-[10.5px] text-gray-700 font-semibold leading-relaxed">
                          Abre esta página web exclusivamente usando <span className="font-bold underline text-emerald-800">Safari</span>.
                        </p>
                      </div>

                      <div className="flex items-start gap-2.5 bg-gray-50 p-2.5 rounded-xl border border-black/5">
                        <span className="flex-shrink-0 w-5.5 h-5.5 rounded-lg bg-emerald-100 text-emerald-700 text-[11px] font-black flex items-center justify-center">2</span>
                        <p className="text-[10.5px] text-gray-700 font-semibold leading-relaxed flex items-center flex-wrap gap-1">
                          Toca el icono de <span>Compartir (Share)</span> <Share2 className="w-3.5 h-3.5 text-emerald-600 inline" /> de Safari.
                        </p>
                      </div>

                      <div className="flex items-start gap-2.5 bg-gray-50 p-2.5 rounded-xl border border-black/5">
                        <span className="flex-shrink-0 w-5.5 h-5.5 rounded-lg bg-emerald-100 text-emerald-700 text-[11px] font-black flex items-center justify-center">3</span>
                        <p className="text-[10.5px] text-gray-700 font-semibold leading-relaxed flex items-center flex-wrap gap-1">
                          Elige la opción <span>"Agregar al inicio"</span> u <span>"Add to Home Screen"</span> <Home className="w-3.5 h-3.5 text-emerald-600 inline" />.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Botones */}
              <div className="p-5 bg-gray-50 border-t border-gray-100 flex flex-col gap-2.5">
                {deferredPrompt && installTab === 'android' ? (
                  <button
                    onClick={async () => {
                      setShowInstallModal(false);
                      await handleInstallClick();
                    }}
                    className="w-full py-2.5 bg-teal-950 text-amber-400 hover:bg-teal-900 border border-amber-400/20 font-black text-[10px] md:text-xs uppercase tracking-widest rounded-2xl shadow-lg hover:scale-[1.01] active:scale-95 transition-all text-center cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Instalar Directamente</span>
                  </button>
                ) : null}
                <button
                  onClick={() => setShowInstallModal(false)}
                  className="w-full py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-black text-[9px] md:text-[10px] uppercase tracking-widest rounded-2xl transition-all text-center cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sello de autenticidad Cuponmanía */}
      <div className="fixed bottom-24 right-6 z-[2000] opacity-20 hover:opacity-100 transition-opacity pointer-events-none sm:pointer-events-auto">
        <img src="https://cossma.com.mx/cuponmania.png" className="w-10 h-10 object-contain grayscale hover:grayscale-0 transition-all" alt="Sello de Autenticidad" />
      </div>

    </div>
  );
}
