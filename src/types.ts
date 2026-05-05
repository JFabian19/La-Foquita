export interface MenuItem {
  id: string;
  nombre: string;
  precio: number | null;
  descripcion?: string;
  precios?: {
    [key: string]: number;
  };
  imagen?: string;
}

export interface MenuCategory {
  categoria: string;
  tamanos?: string[];
  items: MenuItem[];
}

export interface RestaurantInfo {
  nombre: string;
  contacto: string;
  telefono_whatsapp: string;
  servicios: string[];
  redes_sociales: any;
}

export interface MenuData {
  informacion_restaurante: RestaurantInfo;
  menu: MenuCategory[];
}

export interface CartItem {
  id: string;
  nombre: string;
  precio: number;
  cantidad: number;
  variante?: string;
}
