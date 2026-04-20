"use client"

import { MenuItem, MenuCategory, RestaurantTable } from '@/lib/types'
import { useCartStore } from '@/store/cartStore'
import { supabase } from '@/lib/supabaseClient'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useState, useEffect } from 'react'
import { X, Plus, Minus, ShoppingBag, Search, Loader2, Receipt } from 'lucide-react'

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
    items: cartItems, addItem, removeItem, clearCart, getTotalItems, getTotalPrice, isCartOpen, toggleCart, hydrateCart, isHydrated 
  } = useCartStore()

  const { lang, setLang, t } = useLanguage()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [tableStatus, setTableStatus] = useState<RestaurantTable['status']>('available')

  useEffect(() => { hydrateCart() }, [hydrateCart])

  // Controlla lo stato del tavolo in tempo reale (per bloccare ordini se hanno chiesto il conto)
  useEffect(() => {
    const fetchTable = async () => {
      const { data } = await supabase.from('tables').select('status').eq('number', parseInt(tableNumber)).single()
      if (data) setTableStatus(data.status)
    }
    fetchTable()

    const channel = supabase
      .channel(`table-${tableNumber}-status`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tables', filter: `number=eq.${tableNumber}` }, (payload: any) => {
        setTableStatus(payload.new.status)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [tableNumber])

  const getName = (item: MenuItem | MenuCategory) => lang === 'en' && item.name_en ? item.name_en : item.name
  const getDescription = (item: MenuItem) => lang === 'en' && item.description_en ? item.description_en : item.description

  const handleConfirmOrder = async () => {
    if (getTotalItems() === 0 || tableStatus === 'awaiting_payment') return
    setIsSubmitting(true)
    try {
      const { data: tableData, error: tableError } = await supabase.from('tables').select('id').eq('number', parseInt(tableNumber)).single()
      if (tableError || !tableData) throw new Error('Table not found')

      const { data: orderData, error: orderError } = await supabase.from('orders').insert([{ table_id: tableData.id, status: 'confirmed', total: getTotalPrice() }]).select().single()
      if (orderError || !orderData) throw new Error('Error creating order')

      const orderItems = cartItems.map(item => ({ order_id: orderData.id, menu_item_id: item.id, quantity: item.quantity, price: item.price }))
      const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
      if (itemsError) throw new Error('Error inserting items')

      await supabase.from('tables').update({ status: 'active' }).eq('id', tableData.id)
      clearCart(); toggleCart(); alert(t.orderSuccess)
    } catch (error: any) {
      console.error(error)
      alert(t.orderError + " " + error.message)
    } finally { setIsSubmitting(false) }
  }

  const handleRequestBill = async () => {
    const { data: tableData } = await supabase.from('tables').select('id').eq('number', parseInt(tableNumber)).single()
    if (tableData) {
      await supabase.from('tables').update({ status: 'awaiting_payment' }).eq('id', tableData.id)
      alert(t.billRequested)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-32 relative">
      <header className="sticky top-0 bg-white/80 backdrop-blur-md shadow-sm p-4 flex justify-between items-center z-10">
        <h1 className="text-lg font-bold text-slate-800">{t.table}: {tableNumber}</h1>
        <div className="flex gap-2 items-center">
          <button onClick={() => setLang(lang === 'it' ? 'en' : 'it')} className="p-2 rounded-full hover:bg-slate-100 text-lg">{lang === 'it' ? '🇬🇧' : '🇮🇹'}</button>
          <button onClick={() => setFilterCategory(null)} className="p-2 rounded-full hover:bg-slate-100 text-slate-600"><Search size={20} /></button>
          <button onClick={toggleCart} className="p-2 rounded-full hover:bg-slate-100 relative text-slate-600">
            <ShoppingBag size={20} />
            {isHydrated && getTotalItems() > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{getTotalItems()}</span>}
          </button>
        </div>
      </header>

      {tableStatus === 'awaiting_payment' && (
        <div className="bg-purple-600 text-white text-center p-3 font-bold text-sm">{lang === 'it' ? 'Conto richiesto. Attendi il cameriere.' : 'Bill requested. Wait for the waiter.'}</div>
      )}

      <div className="flex gap-2 p-4 overflow-x-auto bg-white border-b">
        <button onClick={() => setFilterCategory(null)} className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${!filterCategory ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>{t.all}</button>
        {categories.map(cat => (
          <button key={cat.id} onClick={() => setFilterCategory(cat.id)} className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${filterCategory === cat.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>{getName(cat)}</button>
        ))}
      </div>

      <div className="p-4 max-w-3xl mx-auto">
        {!filterCategory && (
          <>
            <h2 className="text-xl font-bold mb-4 text-slate-800">{t.topDishes}</h2>
            <div className="grid grid-cols-2 gap-3 mb-10">
              {items?.filter(item => item.is_top).map(item => (
                <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition">
                  <h3 className="font-semibold text-slate-800">{getName(item)}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{getDescription(item)}</p>
                  <div className="mt-4 flex justify-between items-center">
                    <span className="font-bold text-emerald-600">€{item.price.toFixed(2)}</span>
                    <button onClick={() => addItem(item)} disabled={tableStatus === 'awaiting_payment'} className="bg-emerald-600 text-white w-8 h-8 rounded-full hover:bg-emerald-700 flex items-center justify-center transition disabled:bg-slate-300"><Plus size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {categories?.filter(c => !filterCategory || c.id === filterCategory).map(category => {
          const categoryItems = items?.filter(item => item.category_id === category.id)
          return (
            <div key={category.id} className="mb-8">
              <h2 className="text-xl font-bold mb-4 text-slate-800">{getName(category)}</h2>
              <div className="flex flex-col gap-3">
                {categoryItems?.map(item => (
                  <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center hover:shadow-md transition">
                    <div className="mr-4 flex-1">
                      <h3 className="font-semibold text-slate-800">{getName(item)}</h3>
                      <p className="text-xs text-slate-500 mt-1">{getDescription(item)}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="font-bold text-emerald-600">€{item.price.toFixed(2)}</span>
                      <button onClick={() => addItem(item)} disabled={tableStatus === 'awaiting_payment'} className="bg-emerald-600 text-white w-8 h-8 rounded-full hover:bg-emerald-700 flex items-center justify-center transition disabled:bg-slate-300"><Plus size={18} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {isHydrated && tableStatus !== 'awaiting_payment' && getTotalItems() > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-200 p-4 z-20">
          <div className="max-w-3xl mx-auto flex justify-between items-center">
            <div>
              <p className="font-bold text-slate-800">{getTotalItems()} {t.items}</p>
              <p className="text-emerald-600 font-bold text-xl">€{getTotalPrice().toFixed(2)}</p>
            </div>
            <button onClick={toggleCart} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-slate-800 shadow-lg transition">{t.viewCart}</button>
          </div>
        </div>
      )}

      {/* Pulsante Fisso Chiedi Conto */}
      {isHydrated && tableStatus === 'active' && getTotalItems() === 0 && (
         <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-purple-200 p-4 z-20">
            <div className="max-w-3xl mx-auto">
              <button onClick={handleRequestBill} className="w-full bg-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-purple-700 shadow-lg transition flex items-center justify-center gap-2">
                <Receipt size={20}/> {t.requestBill}
              </button>
            </div>
         </div>
      )}

      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="bg-black/50 absolute inset-0" onClick={toggleCart}></div>
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">{t.yourOrder}</h2>
              <button onClick={toggleCart} className="text-slate-500 hover:text-slate-800"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {cartItems.length === 0 && <p className="text-slate-500 text-center mt-10">{t.emptyCart}</p>}
              {cartItems.map(item => (
                <div key={item.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl">
                  <div className="flex-1 mr-2">
                    <p className="font-semibold text-slate-800 text-sm">{getName(item)}</p>
                    <p className="text-emerald-600 font-bold text-sm">€{(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2 bg-white rounded-full border border-slate-200 p-1">
                    <button onClick={() => removeItem(item.id)} className="text-slate-600 hover:bg-slate-100 rounded-full w-7 h-7 flex items-center justify-center transition"><Minus size={14} /></button>
                    <span className="w-5 text-center text-sm font-bold">{item.quantity}</span>
                    <button onClick={() => addItem(item)} className="text-emerald-600 hover:bg-emerald-50 rounded-full w-7 h-7 flex items-center justify-center transition"><Plus size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-slate-600 font-semibold">{t.total}</p>
                <p className="text-2xl font-bold text-slate-900">€{getTotalPrice().toFixed(2)}</p>
              </div>
              <button onClick={handleConfirmOrder} disabled={isSubmitting || cartItems.length === 0} className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold text-lg hover:bg-emerald-700 transition shadow-lg disabled:bg-slate-300 flex items-center justify-center gap-2">
                {isSubmitting ? <><Loader2 size={20} className="animate-spin" /> {t.sending}</> : t.confirmOrder}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}