export type TableStatus = 'available' | 'active' | 'awaiting_payment';

export interface RestaurantTable {
  id: string;
  number: number;
  status: TableStatus;
}

export interface MenuCategory {
  id: string;
  name: string; // IT
  name_en?: string; // EN
}

export interface MenuItem {
  id: string;
  category_id: string;
  name: string; // IT
  name_en?: string; // EN
  description: string | null; // IT
  description_en?: string | null; // EN
  price: number;
  is_top: boolean;
}

export type OrderStatus = 'confirmed' | 'sent' | 'completed';

export interface Order {
  id: string;
  table_id: string;
  status: OrderStatus;
  total: number;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  price: number;
}

export interface Payment {
  id: string;
  table_id: string;
  amount: number;
  created_at: string;
}