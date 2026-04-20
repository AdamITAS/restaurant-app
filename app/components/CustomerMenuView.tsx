"use client"

import { MenuItem, MenuCategory } from '@/lib/types'
import { useCartStore } from '@/store/cartStore'
import { supabase } from '@/lib/supabaseClient'
import { useState, useEffect } from 'react'
import { X, Plus, Minus, ShoppingBag, Search, Loader2 } from 'lucide-react'

export default function CustomerMenuView({ 
  categories, 
  items, 
  tableNumber 
}: { 
  categories: MenuCategory[], 
  items: MenuItem[], 
  tableNumber: string 
}) {
  const { 
    items: cartItems, 
    addItem, 
    removeItem, 
    clearCart, 
    getTotalItems, 
    getTotalPrice, 
    isCartOpen, 
    toggleCart, 
    hydrateCart, 
    isHydrated 
  } = useCartStore()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [filterCategory, setFilterCategory] = useState<string | null>(null)

  // Carica il carrello dal localStorage solo dopo il montaggio nel browser
  useEffect(() => {
    hydrateCart()
  }, [hydrateCart])

  const handleConfirmOrder = async () => {
    if (getTotalItems() === 0) return
    setIsSubmitting(true)

    try {
      // 1. Trova l'UUID del tavolo dal numero
      const { data: tableData, error: tableError } = await supabase
        .from('tables')
        .select('id')
        .eq('number', parseInt(tableNumber))
        .single()

      if (tableError || !tableData) throw new Error('Tavolo non trovato')

      // 2. Crea l'ordine principale
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([
          { table_id: tableData.id, status: 'confirmed', total: getTotalPrice() }
        ])
        .select()
        .single()

      if (orderError || !orderData) throw new Error('Errore creazione ordine')

      // 3. Inserisci i piatti nell'ordine
      const orderItems = cartItems.map(item => ({
        order_id: orderData.id,
        menu_item_id: item.id,
        quantity: item.quantity,
        price: item.price
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) throw new Error('Errore inserimento piatti')

      // 4. Aggiorna stato tavolo
      await supabase
        .from('tables')
        .update({ status: 'active' })
        .eq('id', tableData.id)

      // 5. Pulisci il carrello e chiudi
      clearCart()
      toggleCart()
      alert('Ordine inviato con successo alla cucina! 🎉')

    } catch (error) {
      console.error(error)
      alert('Errore durante invio ordine. Riprova.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-32 relative">
      {/* Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md shadow-sm p-4 flex justify-between items-center z-10">
        <h1 className="text-lg font-bold text-slate-800">Tavolo: {tableNumber}</h1>
        <div className="flex gap-2 items-center">
          <button 
            onClick={() => setFilterCategory(null)} 
            className="p-2 rounded-full hover:bg-slate-100 text-slate-600"
          >
            <Search size={20} />
          </button>
          <button onClick={toggleCart} className="p-2 rounded-full hover:bg-slate-100 relative text-slate-600">
            <ShoppingBag size={20} />
            {isHydrated && getTotalItems() > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {getTotalItems()}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="flex gap-2 p-4 overflow-x-auto bg-white border-b">
        <button onClick={() => setFilterCategory(null)} className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${!filterCategory ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
          Tutto
        </button>
        {categories.map(cat => (
          <button key={cat.id} onClick={() => setFilterCategory(cat.id)} className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${filterCategory === cat.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {cat.name}
          </button>
        ))}
      </div>

      <div className="p-4 max-w-3xl mx-auto">
        {/* TOP PIATTI (solo se nessun filtro attivo) */}
        {!filterCategory && (
          <>
            <h2 className="text-xl font-bold mb-4 text-slate-800 flex items-center gap-2">⭐ Top Piatti</h2>
            <div className="grid grid-cols-2 gap-3 mb-10">
              {items?.filter(item => item.is_top).map(item => (
                <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition">
                  <h3 className="font-semibold text-slate-800">{item.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                  <div className="mt-4 flex justify-between items-center">
                    <span className="font-bold text-emerald-600">€{item.price.toFixed(2)}</span>
                    <button onClick={() => addItem(item)} className="bg-emerald-600 text-white w-8 h-8 rounded-full hover:bg-emerald-700 flex items-center justify-center transition">
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* MENU CATEGORIE */}
        {categories?.filter(c => !filterCategory || c.id === filterCategory).map(category => {
          const categoryItems = items?.filter(item => item.category_id === category.id)
          return (
            <div key={category.id} className="mb-8">
              <h2 className="text-xl font-bold mb-4 text-slate-800">{category.name}</h2>
              <div className="flex flex-col gap-3">
                {categoryItems?.map(item => (
                  <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center hover:shadow-md transition">
                    <div className="mr-4 flex-1">
                      <h3 className="font-semibold text-slate-800">{item.name}</h3>
                      <p className="text-xs text-slate-500 mt-1">{item.description}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="font-bold text-emerald-600">€{item.price.toFixed(2)}</span>
                      <button onClick={() => addItem(item)} className="bg-emerald-600 text-white w-8 h-8 rounded-full hover:bg-emerald-700 flex items-center justify-center transition">
                        <Plus size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* FLOATING CART FOOTER */}
      {isHydrated && getTotalItems() > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-200 p-4 z-20">
          <div className="max-w-3xl mx-auto flex justify-between items-center">
            <div>
              <p className="font-bold text-slate-800">{getTotalItems()} Articoli</p>
              <p className="text-emerald-600 font-bold text-xl">€{getTotalPrice().toFixed(2)}</p>
            </div>
            <button onClick={toggleCart} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-slate-800 shadow-lg transition">
              Vedi Carrello
            </button>
          </div>
        </div>
      )}

      {/* CART SIDEBAR OVERLAY */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="bg-black/50 absolute inset-0" onClick={toggleCart}></div>
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">Il tuo Ordine</h2>
              <button onClick={toggleCart} className="text-slate-500 hover:text-slate-800"><X size={24} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {cartItems.length === 0 && <p className="text-slate-500 text-center mt-10">Il carrello è vuoto</p>}
              {cartItems.map(item => (
                <div key={item.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl">
                  <div className="flex-1 mr-2">
                    <p className="font-semibold text-slate-800 text-sm">{item.name}</p>
                    <p className="text-emerald-600 font-bold text-sm">€{(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2 bg-white rounded-full border border-slate-200 p-1">
                    <button onClick={() => removeItem(item.id)} className="text-slate-600 hover:bg-slate-100 rounded-full w-7 h-7 flex items-center justify-center transition">
                      <Minus size={14} />
                    </button>
                    <span className="w-5 text-center text-sm font-bold">{item.quantity}</span>
                    <button onClick={() => addItem(item)} className="text-emerald-600 hover:bg-emerald-50 rounded-full w-7 h-7 flex items-center justify-center transition">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-slate-600 font-semibold">Totale</p>
                <p className="text-2xl font-bold text-slate-900">€{getTotalPrice().toFixed(2)}</p>
              </div>
              <button 
                onClick={handleConfirmOrder} 
                disabled={isSubmitting || cartItems.length === 0}
                className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold text-lg hover:bg-emerald-700 transition shadow-lg disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={20} className="animate-spin" /> Invio in corso...
                  </>
                ) : (
                  'Conferma Ordine 🧾'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}