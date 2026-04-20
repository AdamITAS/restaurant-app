export type TableStatus = 'available' | 'active' | 'awaiting_payment';

export interface RestaurantTable {
  id: string;
  number: number;
  status: TableStatus;
}

export interface MenuCategory {
  id: string;
  name: string;
}

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
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