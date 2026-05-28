import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Upload, 
  Plus, 
  RotateCw, 
  Share2, 
  ZoomIn, 
  ZoomOut, 
  Trash2, 
  Tag, 
  Filter, 
  Calendar,
  Grid,
  CheckCircle2,
  AlertCircle,
  Heart,
  Bookmark,
  Phone,
  MessageCircle
} from 'lucide-react';
import { getSupabase } from '../lib/supabase';
import { UserProfile, IzcalliFlyer } from '../types';
import { extractContactInfoFromFlyer } from '../services/geminiService';

interface EnlaceIzcalliViewProps {
  currentUser: UserProfile | null;
  showFeedback: (msg: string, type?: 'success' | 'error') => void;
  savedFlyerIds: string[];
  likedFlyerIds: string[];
  onToggleSaveFlyer: (flyerId: string) => void;
  onToggleLikeFlyer: (flyerId: string) => void;
}

const DEFAULT_CATEGORIES = ['Comida', 'Servicios', 'Entretenimiento', 'Deportes', 'Educación', 'Salud', 'Hogar', 'Moda'];

export default function EnlaceIzcalliView({ 
  currentUser, 
  showFeedback,
  savedFlyerIds = [],
  likedFlyerIds = [],
  onToggleSaveFlyer,
  onToggleLikeFlyer
}: EnlaceIzcalliViewProps) {
  // Navigation states
  const [activeTab, setActiveTab] = useState<'gallery' | 'manage'>('gallery');
  
  // Flyers & Categories state
  const [flyers, setFlyers] = useState<IzcalliFlyer[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // New Category input state
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Form states for uploading flyer
  const [selectedFormCategory, setSelectedFormCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [flyerImageData, setFlyerImageData] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  // Contacts extracted from flyer image by AI
  const [flyerWhatsapp, setFlyerWhatsapp] = useState('');
  const [flyerPhone, setFlyerPhone] = useState('');
  const [isExtractingContacts, setIsExtractingContacts] = useState(false);

  // Lightbox view states for deep zoom, pan, and rotate
  const [activeLightboxFlyer, setActiveLightboxFlyer] = useState<IzcalliFlyer | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lightboxBaseScale, setLightboxBaseScale] = useState(1);

  // Touch handlers for pinching zoom on mobile
  const [initialPinchDist, setInitialPinchDist] = useState<number | null>(null);
  const [initialPinchScale, setInitialPinchScale] = useState(1);

  // Load flyers and categories on component mount
  useEffect(() => {
    loadData();
  }, []);

  // Update dynamic base scale for lightbox on screen resize (locked to 1 to use pure css responsive sizing)
  useEffect(() => {
    if (!activeLightboxFlyer) return;
    setLightboxBaseScale(1);
  }, [activeLightboxFlyer]);

  // Dynamically filter categories to only show those that have at least one flyer
  const activeCategories = React.useMemo(() => {
    return categories.filter(cat => flyers.some(f => f.category === cat));
  }, [categories, flyers]);

  // Cleanly auto-reset the selected category filter to 'Todos' if its active status disappears (e.g. after flyer deletion)
  useEffect(() => {
    if (selectedCategory !== 'Todos' && !activeCategories.includes(selectedCategory)) {
      setSelectedCategory('Todos');
    }
  }, [selectedCategory, activeCategories]);

  // Trigger AI contact extraction when a new flyer image is loaded
  useEffect(() => {
    if (!flyerImageData) {
      setFlyerWhatsapp('');
      setFlyerPhone('');
      return;
    }

    const extractContacts = async () => {
      setIsExtractingContacts(true);
      try {
        const result = await extractContactInfoFromFlyer(flyerImageData);
        if (result.whatsapp) {
          setFlyerWhatsapp(result.whatsapp);
        }
        if (result.phone) {
          setFlyerPhone(result.phone);
        }
        if (result.whatsapp || result.phone) {
          showFeedback('¡Información de contacto extraída por IA con éxito!', 'success');
        }
      } catch (err) {
        console.error('Error extracting contacts:', err);
      } finally {
        setIsExtractingContacts(false);
      }
    };

    extractContacts();
  }, [flyerImageData]);

  const formatWhatsAppUrl = (phone: string) => {
    const clean = phone.replace(/\D/g, '');
    if (!clean) return '';
    if (clean.length > 10 && (clean.startsWith('52') || clean.startsWith('1'))) {
      return `https://wa.me/${clean}`;
    }
    return `https://wa.me/52${clean}`;
  };

  const loadData = async () => {
    setIsLoading(true);
    let loadedFlyers: IzcalliFlyer[] = [];
    let loadedCategories = [...DEFAULT_CATEGORIES];

    try {
      const supabase = getSupabase();
      if (supabase) {
        // Fetch categories
        const { data: dbCats, error: catError } = await supabase
          .from('izcalli_categories')
          .select('name');
        
        if (!catError && dbCats && dbCats.length > 0) {
          loadedCategories = Array.from(new Set([...DEFAULT_CATEGORIES, ...dbCats.map(c => c.name)]));
        }

        // Fetch flyers
        const { data: dbFlyers, error: flyerError } = await supabase
          .from('izcalli_flyers')
          .select('*')
          .order('created_at', { ascending: false });

        if (!flyerError && dbFlyers) {
          loadedFlyers = dbFlyers.map(f => ({
            id: f.id,
            title: f.title || '',
            imageUrl: f.image_url,
            category: f.category_name,
            creatorId: f.creator_id,
            creatorName: f.creator_name || 'Anónimo',
            createdAt: f.created_at,
            whatsapp: f.whatsapp || '',
            phone: f.phone || ''
          }));
        } else if (flyerError) {
          console.warn('Database error while fetching flyers, falling back to local storage', flyerError);
          throw flyerError;
        }
      }
    } catch (err) {
      // Fallback local storage
      const localFlyersStr = localStorage.getItem('izcalli_flyers_local');
      if (localFlyersStr) {
        try {
          loadedFlyers = JSON.parse(localFlyersStr);
        } catch (_) {}
      }
      
      const localCatsStr = localStorage.getItem('izcalli_categories_local');
      if (localCatsStr) {
        try {
          loadedCategories = Array.from(new Set([...DEFAULT_CATEGORIES, ...JSON.parse(localCatsStr)]));
        } catch (_) {}
      }
    }

    setFlyers(loadedFlyers);
    setCategories(loadedCategories);
    if (loadedCategories.length > 0 && !loadedCategories.includes(selectedFormCategory)) {
      setSelectedFormCategory(loadedCategories[0]);
    }
    setIsLoading(false);
  };

  // Safe save handler syncs both Supabase and LocalStorage
  const handleAddCategory = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const normalized = newCategoryName.trim();
    if (!normalized) return;

    if (categories.some(c => c.toLowerCase() === normalized.toLowerCase())) {
      showFeedback('La categoría ya está registrada', 'error');
      return;
    }

    const updatedCats = Array.from(new Set([...categories, normalized]));
    setCategories(updatedCats);
    localStorage.setItem('izcalli_categories_local', JSON.stringify(updatedCats.filter(c => !DEFAULT_CATEGORIES.includes(c))));
    
    // Select the category instantly
    setSelectedFormCategory(normalized);
    setNewCategoryName('');
    setShowAddCategory(false);
    showFeedback(`Categoría "${normalized}" registrada al instante`, 'success');

    // Attempt Supabase insert in background
    try {
      const supabase = getSupabase();
      if (supabase) {
        await supabase.from('izcalli_categories').insert([{ name: normalized }]);
      }
    } catch (err) {
      console.warn('Silent database write error for category:', err);
    }
  };

  // Convert uploaded image file to base64 with canvas-based compression
  const processFile = (file: File) => {
    if (file.size > 20 * 1024 * 1024) { // Increase absolute limit to 20MB but compress to ~150KB
      showFeedback('La imagen es demasiado grande. Máximo 20MB permitido.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas to scale down if dimensions are large, preventing huge base64 strings
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1100; // Optimal constraint for sharp display and low memory footprint

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Draw image to canvas
          ctx.drawImage(img, 0, 0, width, height);
          // Compress with quality 0.75 to save massive amounts of network & disk resources
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
          setFlyerImageData(compressedBase64);
        } else {
          setFlyerImageData(event.target?.result as string);
        }
      };
      img.onerror = () => {
        setFlyerImageData(event.target?.result as string);
      };
      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Submit new flyer
  const handlePublishFlyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flyerImageData) {
      showFeedback('Por favor selecciona una imagen de flyer', 'error');
      return;
    }

    setIsSubmitting(true);
    const creatorName = currentUser?.businessName || currentUser?.name || 'Patrocinador';
    const creatorId = currentUser?.id || 'anonymous';

    const newFlyer: IzcalliFlyer = {
      id: crypto.randomUUID(),
      title: `Flyer (${selectedFormCategory}) - ${creatorName}`,
      imageUrl: flyerImageData,
      category: selectedFormCategory,
      creatorId,
      creatorName,
      createdAt: new Date().toISOString(),
      whatsapp: flyerWhatsapp.trim() || undefined,
      phone: flyerPhone.trim() || undefined
    };

    // Save locally first for robust fallback
    const updatedFlyers = [newFlyer, ...flyers];
    setFlyers(updatedFlyers);
    
    // Catch StorageQuotaExceeded and slice old items if necessary
    try {
      localStorage.setItem('izcalli_flyers_local', JSON.stringify(updatedFlyers));
    } catch (err) {
      console.warn('LocalStorage quota limit reached, saving with sliced history fallback...', err);
      try {
        // Keep only top 10 recent flyers locally to free up space
        const limited = updatedFlyers.slice(0, 10);
        localStorage.setItem('izcalli_flyers_local', JSON.stringify(limited));
      } catch (innerErr) {
        console.error('Failed to write even limited local flyers:', innerErr);
      }
    }

    let dbSucceeded = false;
    try {
      const supabase = getSupabase();
      if (supabase) {
        const { error } = await supabase.from('izcalli_flyers').insert([{
          id: newFlyer.id,
          title: newFlyer.title,
          image_url: newFlyer.imageUrl,
          category_name: newFlyer.category,
          creator_id: newFlyer.creatorId,
          creator_name: newFlyer.creatorName,
          created_at: newFlyer.createdAt,
          whatsapp: newFlyer.whatsapp || null,
          phone: newFlyer.phone || null
        }]);
        if (!error) {
          dbSucceeded = true;
        } else {
          console.warn('Supabase insertion error, using local fallback state', error);
        }
      }
    } catch (err) {
      console.warn('Background Supabase insert error:', err);
    }

    setIsSubmitting(false);
    // Reset form fields
    setFlyerImageData(null);
    setFlyerWhatsapp('');
    setFlyerPhone('');
    setActiveTab('gallery');

    if (dbSucceeded) {
      showFeedback('¡Flyer publicado y sincronizado con éxito!');
    } else {
      showFeedback('Flyer publicado con éxito (guardado localmente)');
    }
  };

  // Delete flyer
  const handleDeleteFlyer = async (flyerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('¿Está seguro de eliminar este flyer publicitario?')) return;

    // Filter local state
    const updatedFlyers = flyers.filter(f => f.id !== flyerId);
    setFlyers(updatedFlyers);
    localStorage.setItem('izcalli_flyers_local', JSON.stringify(updatedFlyers));

    let dbSucceeded = false;
    try {
      const supabase = getSupabase();
      if (supabase) {
        const { error } = await supabase
          .from('izcalli_flyers')
          .delete()
          .eq('id', flyerId);
        if (!error) dbSucceeded = true;
      }
    } catch (err) {
      console.warn('Database error when deleting flyer:', err);
    }

    if (dbSucceeded) {
      showFeedback('Flyer eliminado con éxito de la red');
    } else {
      showFeedback('Flyer eliminado localmente');
    }
  };

  // Lightbox mechanics for drag and zoom
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

  // Share flyer image
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
            showFeedback('¡Apertura de compartir flyer!');
            return;
          }
        }

        // Text share fallback
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: window.location.href
        });
        showFeedback('¡Apertura de compartir flyer!');
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
      showFeedback('¡Enlace de flyer copiado al portapapeles!');
    }).catch(() => {
      showFeedback('No se pudo copiar el enlace', 'error');
    });
  };

  const filteredFlyers = selectedCategory === 'Todos' 
    ? flyers 
    : flyers.filter(f => f.category === selectedCategory);

  const canManage = currentUser?.role === 'admin' || currentUser?.role === 'patrocinador';

  return (
    <div className="w-full bg-gray-50/50 min-h-screen pb-32">
      {/* Elegant Header Banner */}
      <div className="bg-gradient-to-r from-teal-900 to-indigo-950 text-white py-12 px-6 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(20,250,200,0.1),transparent_50%)]" />
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <span className="text-[10px] uppercase font-black tracking-widest bg-emerald-400 text-teal-950 px-3 py-1.5 rounded-full font-mono mb-2.5 inline-block">
              Módulo Oficial
            </span>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none mb-2">
              Enlace Izcalli
            </h1>
            <p className="text-xs md:text-sm font-bold uppercase tracking-widest text-emerald-300/80">
              Cartelera Digital Interactiva de Comercios y Flyers Publicitarios
            </p>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => setActiveTab('gallery')}
              className={`px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${activeTab === 'gallery' ? 'bg-white text-teal-950 shadow-md scale-105' : 'bg-white/10 text-white hover:bg-white/15'}`}
            >
              Explorar Cartelera
            </button>
            {canManage && (
              <button 
                onClick={() => setActiveTab('manage')}
                className={`px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 ${activeTab === 'manage' ? 'bg-emerald-400 text-teal-950 shadow-md scale-105' : 'bg-white/10 text-white hover:bg-white/15'}`}
              >
                <Upload className="w-4 h-4" />
                Subir Digital Flyer
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 mt-8">
        
        {activeTab === 'gallery' ? (
          <>
            {/* Category selection selector */}
            <div className="mb-8 overflow-x-auto py-2 -mx-4 px-4 flex gap-2 scrollbar-none select-none">
              <button
                onClick={() => setSelectedCategory('Todos')}
                className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  selectedCategory === 'Todos' 
                    ? 'bg-teal-950 text-white shadow-md' 
                    : 'bg-white text-gray-500 hover:bg-gray-100 border border-black/5'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                Todos
              </button>
              {activeCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    selectedCategory === cat 
                      ? 'bg-teal-950 text-white shadow-md' 
                      : 'bg-white text-gray-500 hover:bg-gray-100 border border-black/5'
                  }`}
                >
                  <Tag className="w-3.5 h-3.5 text-teal-500/50" />
                  {cat}
                </button>
              ))}
            </div>

            {/* Main Showcase Gallery */}
            {isLoading ? (
              <div className="py-24 text-center">
                <div className="w-12 h-12 border-4 border-black/10 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                <p className="text-xs font-black uppercase tracking-widest text-black/40">Cargando Cartelera Digital...</p>
              </div>
            ) : filteredFlyers.length === 0 ? (
              <div className="bg-white rounded-[40px] p-16 text-center border border-black/5 max-w-xl mx-auto shadow-sm mt-8">
                <div className="w-20 h-20 bg-gray-50 rounded-[28px] flex items-center justify-center mx-auto mb-6 text-black/10">
                  <Filter className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight mb-2">Cartelera vacía</h3>
                <p className="text-xs text-black/40 uppercase font-bold tracking-widest max-w-sm mx-auto leading-relaxed">
                  Aún no se han publicado flyers publicitarios en la categoría de <span className="text-primary font-black">"{selectedCategory}"</span>.
                </p>
                {canManage && (
                  <button 
                    onClick={() => setActiveTab('manage')}
                    className="mt-6 px-6 py-3 bg-teal-950 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all active:scale-95"
                  >
                    Publicar el Primero
                  </button>
                )}
              </div>
            ) : (
              /* Custom Responsive Grid */
              /* Mobile: 2 columns, Tablet: 4 columns, Desktop: 6 columns as requested */
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
                {filteredFlyers.map(flyer => (
                  <motion.div
                    key={flyer.id}
                    layoutId={`flyer-card-${flyer.id}`}
                    onClick={() => {
                      setActiveLightboxFlyer(flyer);
                      setZoomScale(1);
                      setPanOffset({ x: 0, y: 0 });
                      setRotation(0);
                    }}
                    className="group relative bg-white bg-blend-lighten border border-black/5 rounded-[24px] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-zoom-in flex flex-col h-full overflow-hidden"
                  >
                    {/* Header bar / category of the flyer */}
                    <div className="p-3 pb-1 flex items-center justify-between border-b border-black/5 bg-gray-50 text-[8px] font-black uppercase tracking-widest text-black/40 truncate select-none">
                      <span className="flex items-center gap-1 shrink-0 bg-white border border-black/5 px-2 py-0.5 rounded-full text-[7px] text-teal-600">
                        {flyer.category}
                      </span>
                      <span className="truncate max-w-[50%]">{flyer.creatorName}</span>
                    </div>

                    {/* Image Area */}
                    <div className="flex-1 overflow-hidden aspect-[4/5] bg-neutral-950 relative">
                      <img 
                        src={flyer.imageUrl} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                        loading="lazy"
                        alt={flyer.title}
                      />
                      
                      {/* Premium Hover Zoom Overlay Icon */}
                      <div className="absolute inset-0 bg-teal-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-1.5 text-white z-10">
                        <ZoomIn className="w-6 h-6 animate-pulse" />
                        <span className="text-[8px] font-black uppercase tracking-widest bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-md">
                          Ver Mas Grande
                        </span>
                      </div>

                      {/* Floating One-Click Quick Contacts */}
                      {(flyer.whatsapp || flyer.phone) && (
                        <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center z-25 gap-2 pointer-events-none">
                          <div className="flex gap-1.5 pointer-events-auto">
                            {flyer.whatsapp && (
                              <a
                                href={formatWhatsAppUrl(flyer.whatsapp)}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
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

                    {/* Flyer Title & Admin Operations */}
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
                            onToggleLikeFlyer(flyer.id);
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
                            onToggleSaveFlyer(flyer.id);
                          }}
                          className={`p-1.5 rounded-lg transition-colors ${
                            savedFlyerIds.includes(flyer.id) 
                              ? 'bg-teal-50 text-teal-600' 
                              : 'hover:bg-neutral-100 text-gray-400 hover:text-teal-600'
                          }`}
                          title="Guardar en Cuponera"
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${savedFlyerIds.includes(flyer.id) ? 'fill-current' : ''}`} />
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

                        {(currentUser?.role === 'admin' || (currentUser?.role === 'patrocinador' && currentUser.id === flyer.creatorId)) && (
                          <button
                            onClick={(e) => handleDeleteFlyer(flyer.id, e)}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition-colors"
                            title="Eliminar Flyer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        ) : (
          /* Subir / Administrar Flyers Form View */
          <div className="max-w-xl mx-auto bg-white border border-black/5 rounded-[32px] overflow-hidden shadow-xl mt-4">
            <div className="p-6 bg-teal-950 text-white flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-emerald-400" />
                <h3 className="font-black uppercase tracking-tight text-sm">Formulario de Flyer Digital</h3>
              </div>
              <button 
                onClick={() => setActiveTab('gallery')}
                className="text-white/60 hover:text-white p-1 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePublishFlyer} className="p-8 space-y-6">
              
              {/* Image Upload Component */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-black/40 px-2 tracking-widest block">
                  Carga Imagen del Flyer (Obligatorio)
                </label>

                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`relative w-full aspect-[4/5] max-h-[380px] flex flex-col items-center justify-center border-2 border-dashed rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 ${
                    dragActive ? 'border-emerald-400 bg-emerald-50/20' : 'border-black/5 hover:border-teal-500/20 bg-gray-50'
                  }`}
                >
                  {flyerImageData ? (
                    <div className="relative w-full h-full p-2 group bg-neutral-900">
                      <img src={flyerImageData} className="w-full h-full object-contain" alt="Preview Flyer" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFlyerImageData(null);
                        }}
                        className="absolute top-4 right-4 p-2 bg-black/70 hover:bg-black text-white hover:text-red-400 rounded-full transition-all border border-white/10"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-full h-full flex flex-col items-center justify-center p-6 text-center select-none cursor-pointer">
                      <div className="w-16 h-16 bg-white rounded-2xl border border-black/5 flex items-center justify-center text-teal-950 mb-4 shadow-sm group-hover:scale-105 transition-transform">
                        <Upload className="w-7 h-7" />
                      </div>
                      <span className="text-xs font-black uppercase text-gray-800 tracking-tight leading-none mb-1">
                        Arrastra tu imagen de flyer aquí
                      </span>
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                        or haz clic para examinar archivos
                      </span>
                      <span className="text-[8px] font-black tracking-widest uppercase text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full mt-4">
                        Formato vertical recomendado (PNG, JPG o JPEG)
                      </span>
                      <input 
                        type="file" 
                        required
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleFileChange} 
                      />
                    </label>
                  )}
                </div>
              </div>



              {/* Extraction loading status or success indicator */}
              {flyerImageData && (
                <div className="space-y-2">
                  {isExtractingContacts ? (
                    <div className="flex items-center gap-3 p-3.5 bg-sky-50 text-sky-800 text-[10px] font-black uppercase tracking-wider rounded-2xl border border-sky-100 animate-pulse">
                      <div className="w-4 h-4 border-2 border-sky-600 border-t-transparent rounded-full animate-spin shrink-0" />
                      <span>Analizando imagen con IA para extraer contactos...</span>
                    </div>
                  ) : (flyerWhatsapp || flyerPhone) ? (
                    <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 text-emerald-800 text-[10px] font-black uppercase tracking-wider rounded-2xl border border-emerald-100">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>¡Contactos extraídos y rellenados automáticamente con IA!</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5 p-3.5 bg-amber-50/50 text-amber-800 text-[10px] font-black uppercase tracking-wider rounded-2xl border border-amber-100/50">
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>Puedes guardar los contactos manualmente si la IA no los detectó en esta imagen.</span>
                    </div>
                  )}
                </div>
              )}

              {/* WhatsApp & Phone Number Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-black/40 px-2 tracking-widest flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                    WhatsApp del Negocio
                  </label>
                  <input 
                    type="tel" 
                    placeholder="Ej: 5512345678"
                    value={flyerWhatsapp}
                    onChange={e => setFlyerWhatsapp(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-teal-500/20 outline-none placeholder:text-gray-300"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-black/40 px-2 tracking-widest flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-indigo-500" />
                    Teléfono de Contacto
                  </label>
                  <input 
                    type="tel" 
                    placeholder="Ej: 5512345678"
                    value={flyerPhone}
                    onChange={e => setFlyerPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-teal-500/20 outline-none placeholder:text-gray-300"
                  />
                </div>
              </div>

              {/* Category & Instant Category builder */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-2">
                  <label className="text-[10px] font-black uppercase text-black/40 tracking-widest">
                    Selecciona Categoría del Flyer
                  </label>
                  {!showAddCategory && (
                    <button
                      type="button"
                      onClick={() => setShowAddCategory(true)}
                      className="text-[9px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 font-bold" />
                      Registrar Categoría Instante
                    </button>
                  )}
                </div>

                <AnimatePresence mode="wait">
                  {showAddCategory ? (
                    <motion.div 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-500/10 flex items-center gap-2"
                    >
                      <div className="flex-1">
                        <input 
                          type="text"
                          required
                          placeholder="Nombre de la nueva categoría..."
                          value={newCategoryName}
                          onChange={e => setNewCategoryName(e.target.value)}
                          className="w-full bg-white border border-black/5 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddCategory}
                        className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
                      >
                        Alta
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddCategory(false);
                          setNewCategoryName('');
                        }}
                        className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-xl transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ) : (
                    <select
                      value={selectedFormCategory}
                      onChange={e => setSelectedFormCategory(e.target.value)}
                      className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-teal-500/20 outline-none appearance-none"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  )}
                </AnimatePresence>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('gallery')}
                  className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-600 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all h-12"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-4 bg-teal-950 text-emerald-400 hover:bg-teal-900 border border-emerald-400/20 shadow-xl shadow-teal-950/25 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all disabled:opacity-50 h-12 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Publicar Digital Flyer</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        )}
      </div>

      {/* GORGEOUS IN-APP FULLSCREEN ZOOM LIGHTBOX FOR FLYERS */}
      <AnimatePresence>
        {activeLightboxFlyer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-xl flex flex-col justify-between items-center p-4 md:p-8 select-none"
            onWheel={handleWheel}
          >
            {/* Header / Brand Branding & Close Button */}
            <div className="w-full flex justify-between items-center z-[1010] max-w-6xl mt-2 select-none">
              <div className="flex flex-col">
                <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest bg-emerald-400/15 px-3 py-1.5 rounded-full border border-emerald-400/20 w-fit">
                  {activeLightboxFlyer.category}
                </span>
                <span className="text-white text-xl md:text-2xl font-black uppercase tracking-tight mt-2 leading-none">
                  {activeLightboxFlyer.title}
                </span>
                <span className="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-1">
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

            {/* Lightbox Center Area for dragging/multitouch */}
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
                className="transition-transform duration-75 select-none pointer-events-none flex items-center justify-center w-full h-full"
              >
                <img 
                  src={activeLightboxFlyer.imageUrl} 
                  className="w-full h-auto max-w-[95vw] max-h-[72vh] md:max-w-[1000px] md:max-h-[580px] object-contain rounded-2xl md:rounded-[24px] shadow-2xl bg-neutral-900" 
                  alt={activeLightboxFlyer.title}
                />
              </div>
            </div>

            {/* Navigation and Actions dock bar */}
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
                  onClick={() => onToggleLikeFlyer(activeLightboxFlyer.id)}
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
                  onClick={() => onToggleSaveFlyer(activeLightboxFlyer.id)}
                  className={`transition-colors p-2 cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                    savedFlyerIds.includes(activeLightboxFlyer.id) ? 'text-teal-400' : 'text-white hover:text-teal-400'
                  }`}
                  title="Guardar"
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
}
