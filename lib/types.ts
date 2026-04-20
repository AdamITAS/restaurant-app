// Stati possibili per un tavolo
export type TableStatus = 'available' | 'active' | 'awaiting_payment';

export interface RestaurantTable {
  id: string;
  number: number;
  status: TableStatus;
}

// Categorie del Menu
export interface MenuCategory {
  id: string;
  name: string;       // Italiano
  name_en?: string;   // Inglese (opzionale)
}

// Piatti del Menu
export interface MenuItem {
  id: string;
  category_id: string;
  name: string;           // Italiano
  name_en?: string;       // Inglese (opzionale)
  description: string | null;    // Italiano
  description_en?: string | null; // Inglese (opzionale)
  price: number;
  is_top: boolean;
  image_url?: string | null; // Preparato per la Fase 4 (Foto piatti)
}

// Stati possibili per un ordine
export type OrderStatus = 'confirmed' | 'sent' | 'completed';

export interface Order {
  id: string;
  table_id: string;
  status: OrderStatus;
  total: number;
  created_at: string;
}

// Piatti contenuti in un ordine
export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  price: number;
}

// Storico dei pagamenti
export interface Payment {
  id: string;
  table_id: string;
  amount: number;
  created_at: string;
}