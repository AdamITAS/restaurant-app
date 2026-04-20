import { create } from 'zustand'
import { MenuItem } from '@/lib/types'

interface CartItem extends MenuItem {
  quantity: number
}

interface CartState {
  items: CartItem[]
  isCartOpen: boolean
  isHydrated: boolean
  toggleCart: () => void
  addItem: (item: MenuItem) => void
  removeItem: (itemId: string) => void
  clearCart: () => void
  hydrateCart: () => void
  getTotalItems: () => number
  getTotalPrice: () => number
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  isCartOpen: false,
  isHydrated: false, // Partiamo dicendo che non abbiamo ancora caricato i dati locali
  
  toggleCart: () => set((state) => ({ isCartOpen: !state.isCartOpen })),
  
  // Funzione per caricare i dati dal browser in sicurezza
  hydrateCart: () => {
    const savedCart = localStorage.getItem('restaurantCart')
    if (savedCart) {
      set({ items: JSON.parse(savedCart), isHydrated: true })
    } else {
      set({ isHydrated: true })
    }
  },

  addItem: (item) => {
    set((state) => {
      const existingItem = state.items.find((i) => i.id === item.id)
      let newItems;
      if (existingItem) {
        newItems = state.items.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      } else {
        newItems = [...state.items, { ...item, quantity: 1 }]
      }
      if (state.isHydrated) localStorage.setItem('restaurantCart', JSON.stringify(newItems))
      return { items: newItems }
    })
  },
  
  removeItem: (itemId) => {
    set((state) => {
      const newItems = state.items.reduce((acc, item) => {
        if (item.id === itemId) {
          if (item.quantity === 1) return acc
          return [...acc, { ...item, quantity: item.quantity - 1 }]
        }
        return [...acc, item]
      }, [] as CartItem[])
      if (state.isHydrated) localStorage.setItem('restaurantCart', JSON.stringify(newItems))
      return { items: newItems }
    })
  },
  
  clearCart: () => {
    if (get().isHydrated) localStorage.removeItem('restaurantCart')
    set({ items: [] })
  },
  
  getTotalItems: () => get().items.reduce((total, item) => total + item.quantity, 0),
  getTotalPrice: () => get().items.reduce((total, item) => total + item.price * item.quantity, 0),
}))