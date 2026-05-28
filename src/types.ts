/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'admin' | 'patrocinador' | 'usuario';
export type AppView = 'landing' | 'generator' | 'marketplace' | 'wallet' | 'profile' | 'admin_dashboard' | 'business_registration' | 'admin_users' | 'login' | 'register' | 'notifications' | 'admin_flyer' | 'coupon_counter' | 'privacy' | 'enlace_izcalli';

export interface CouponRedemption {
  id: string;
  couponId: string;
  sponsorId: string;
  redeemerId: string;
  redeemedAt: string;
}

export interface UserProfile {
  id: string;
  role: UserRole;
  name: string;
  username: string;
  email: string;
  whatsapp: string;
  photo?: string | null;
  businessName?: string; // Solo patrocinadores
  representativeName?: string; // Solo patrocinadores
  address?: string;
  locationLink?: string;
  website?: string;
  services?: string[]; // Servicios o productos que ofrece
  isActive: boolean;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  is_read: boolean;
  created_at: string;
}

export interface AdminMetrics {
  totalUsers: number;
  totalSponsors: number;
  totalAdmins: number;
  totalCoupons: number;
  totalRevenue: number;
  dailyActiveUsers: number;
  pageVisits: number;
  totalFlyers?: number;
}

export interface CuponConfig {
  id: string;
  publishedAt: string;
  isPublished?: boolean;
  creatorId?: string;
  imageData?: string;
  savedBy?: string[];
  status: "success";
  data: {
    header: {
      nombre_negocio: string;
      logo_url?: string;
    };
    oferta: {
      texto: string;
      size: "hero";
    };
    categoria: string;
    condiciones: string;
    cronometro: {
      horas_totales: number;
      timestamp_final: string;
      fecha_inicio?: string;
      fecha_fin?: string;
    };
    branding: {
      watermark_url: string;
      position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    };
    diseno: {
      color_primario: string;
      color_acento: string;
      estetica_ticket?: {
        estilo_fuente: string;
        forma_borde: string;
        paleta_sugerida: string[];
      };
      ai_image_prompt_fondo?: string;
      codigo_canje: {
        tipo: string;
        valor: string;
      };
      icono_sugerido?: string;
    };
  };
}

export interface CuponResponse {
  result: CuponConfig;
}

export interface BusinessData {
  nombre_negocio: string;
  rubro: string;
  categoria: string;
  oferta_principal: string;
  detalles_adicionales?: string;
  horas_vigencia?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  logo_data?: string;
  website?: string;
}

export interface IzcalliFlyer {
  id: string;
  title: string;
  imageUrl: string;
  category: string;
  creatorId: string;
  creatorName: string;
  createdAt: string;
  whatsapp?: string;
  phone?: string;
}

