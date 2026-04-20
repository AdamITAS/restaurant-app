"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Order, OrderItem, MenuItem, RestaurantTable } from '@/lib/types'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { LogIn, ChefHat, CheckCircle, CreditCard, Receipt, Clock, UtensilsCrossed, CircleDot, Table2, LogOut, Languages, RotateCcw } from 'lucide-react'

const ADMIN_PIN = "1234"

interface OrderWithItems extends Order {
  order_items: (OrderItem & { menu_items: MenuItem })[]
}

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [pinInput, setPinInput] = useState("")
  const [loading, setLoading] = useState(true)
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [kitchenOrders, setKitchenOrders] = useState<OrderWithItems[]>([])
  const [completedOrders, setCompletedOrders] = useState<OrderWithItems[]>([])
  const { lang, setLang, t } = useLanguage()

  const handleLogin = () => {
    if (pinInput === ADMIN_PIN) { setIsAuthenticated(true); setLoading(true) }
    else { alert(t.wrongPin); setPinInput("") }
  }

  const fetchDashboardData = async () => {
    try {
      const { data: tablesData } = await supabase.from('tables').select('*').order('number', { ascending: true })
      if (tablesData) setTables(tablesData as RestaurantTable[])

      const { data: kitchenData } = await supabase.from('orders').select('*, order_items(*, menu_items(name, name_en))').in('status', ['confirmed', 'sent']).order('created_at', { ascending: true })
      if (kitchenData) setKitchenOrders(kitchenData as OrderWithItems[])

      const { data: completedData } = await supabase.from('orders').select('*, order_items(*, menu_items(name, name_en))').eq('status', 'completed').order('created_at', { ascending: false })
      if (completedData) setCompletedOrders(completedData as OrderWithItems[])

    } catch (error: any) { console.error("Errore rete:", error) } 
    finally { setLoading(false) }
  }

  useEffect(() => {
    if (!isAuthenticated) return
    fetchDashboardData()
    const channel = supabase.channel('admin-dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload: any) => {
        // Aggiornamento ottimistico: se lo è cambiato, aggiorniamo la UI subito
        if (payload.eventType === 'UPDATE') {
          if (payload.new.status === 'sent') {
            setKitchenOrders(prev => prev.map(o => o.id === payload.new.id ? {...o, status: 'sent'} as OrderWithItems : o))
          } else if (payload.new.status === 'completed') {
            setKitchenOrders(prev => prev.filter(o => o.id !== payload.new.id))
            setCompletedOrders(prev => [...prev, payload.new as OrderWithItems])
          }
        } else {
          fetchDashboardData() // Per insert nuovi, facciamo fetch completa
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, (payload: any) => {
        setTables(prev => prev.map(t => t.id === payload.new.id ? payload.new as RestaurantTable : t))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [isAuthenticated])

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    // 1. Aggiornamento Ottimistico UI (cambia istantaneamente senza aspettare Supabase)
    if (newStatus === 'sent') {
      setKitchenOrders(prev => prev.map(o => o.id === orderId ? {...o, status: 'sent'} as OrderWithItems : o))
    } else if (newStatus === 'completed') {
      setKitchenOrders(prev => prev.filter(o => o.id !== orderId))
    }
    // 2. Invio a Supabase in background
    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
  }

  const handleRequestBill = async (tableId: string) => {
    await supabase.from('tables').update({ status: 'awaiting_payment' }).eq('id', tableId)
  }

  const handleConfirmPayment = async (tableId: string) => {
    const { data: orders } = await supabase.from('orders').select('total').eq('table_id', tableId).eq('status', 'completed')
    const totalAmount = orders?.reduce((sum, order) => sum + order.total, 0) || 0
    await supabase.from('payments').insert([{ table_id: tableId, amount: totalAmount }])
    await supabase.from('tables').update({ status: 'available' }).eq('id', tableId)
  }

  const forceResetTable = async (tableId: string) => {
    if(confirm(lang === 'it' ? 'Resettare questo tavolo?' : 'Reset this table?')) {
      await supabase.from('tables').update({ status: 'available' }).eq('id', tableId)
    }
  }

  const getTableName = (tableId: string) => { const table = tables.find(t => t.id === tableId); return table ? table.number : '?' }
  const getItemName = (item: MenuItem) => lang === 'en' && item.name_en ? item.name_en : item.name

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-2xl text-center max-w-sm w-full">
          <LogIn size={40} className="mx-auto mb-4 text-slate-800" />
          <h1 className="text-2xl font-bold mb-6 text-slate-800">{t.kitchenAccess}</h1>
          <input type="number" value={pinInput} onChange={(e) => setPinInput(e.target.value)} placeholder={t.enterPin} className="w-full text-center text-2xl tracking-[1em] p-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none mb-4" />
          <button onClick={handleLogin} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold text-xl hover:bg-emerald-700 active:scale-95 transition">{t.enter}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-20 shadow-lg">
        <h1 className="text-xl font-bold flex items-center gap-2"><UtensilsCrossed size={24} className="text-emerald-400" /> {lang === 'it' ? 'Gestione Ristorante' : 'Restaurant Manager'}</h1>
        <div className="flex items-center gap-4">
          <button onClick={() => setLang(lang === 'it' ? 'en' : 'it')} className="p-2 hover:bg-slate-800 rounded-lg transition flex items-center gap-2 text-sm font-medium"><Languages size={18} /> {lang === 'it' ? 'EN' : 'IT'}</button>
          <button onClick={() => setIsAuthenticated(false)} className="p-2 hover:bg-red-700 rounded-lg transition flex items-center gap-2 text-sm font-medium text-red-300"><LogOut size={18} /></button>
        </div>
      </header>

      <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-8">
        {loading ? <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div></div> : (
          <>
            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><Table2 size={22} className="text-slate-500" /> {lang === 'it' ? 'Sala Ristorante' : 'Floor Plan'}</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {tables.map(table => {
                  const tKitchen = kitchenOrders.filter(o => o.table_id === table.id)
                  const tCompleted = completedOrders.filter(o => o.table_id === table.id)
                  
                  let statusLabel = ""
                  if (table.status === 'available') statusLabel = lang === 'it' ? 'Libero' : 'Free'
                  else if (table.status === 'awaiting_payment') statusLabel = lang === 'it' ? 'Da Pagare' : 'To Pay'
                  else if (tKitchen.length > 0) statusLabel = lang === 'it' ? 'In Cucina' : 'In Kitchen'
                  else if (tCompleted.length > 0) statusLabel = lang === 'it' ? 'Sto consumando' : 'Dining'
                  else statusLabel = lang === 'it' ? 'Scegliendo...' : 'Selecting...'

                  return (
                    <div key={table.id} className={`rounded-2xl p-4 border-2 shadow-sm flex flex-col transition-colors duration-300 ${
                      table.status === 'available' ? 'bg-emerald-50 border-emerald-200' :
                      table.status === 'awaiting_payment' ? 'bg-purple-50 border-purple-300' :
                      'bg-amber-50 border-amber-200'
                    }`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-2xl font-bold text-slate-800">T{table.number}</span>
                        <button onClick={() => forceResetTable(table.id)} className="text-slate-400 hover:text-red-500 transition"><RotateCcw size={14}/></button>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full inline-block self-start mb-3 ${
                        table.status === 'available' ? 'bg-emerald-200 text-emerald-700' :
                        table.status === 'awaiting_payment' ? 'bg-purple-200 text-purple-700' :
                        tKitchen.length > 0 ? 'bg-orange-200 text-orange-700' :
                        tCompleted.length > 0 ? 'bg-blue-200 text-blue-700' :
                        'bg-yellow-200 text-yellow-700'
                      }`}>{statusLabel}</span>

                      <div className="mt-auto">
                        {table.status === 'active' && ( <button onClick={() => handleRequestBill(table.id)} className="w-full bg-purple-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-purple-700 flex items-center justify-center gap-1"><Receipt size={12}/> {t.requestBillBtn}</button> )}
                        {table.status === 'awaiting_payment' && ( <button onClick={() => handleConfirmPayment(table.id)} className="w-full bg-emerald-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-emerald-700 flex items-center justify-center gap-1"><CreditCard size={12}/> {lang === 'it' ? 'Pagato' : 'Paid'}</button> )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><ChefHat size={22} className="text-orange-500" /> {lang === 'it' ? 'Coda Cucina' : 'Kitchen Queue'} <span className="ml-2 text-sm font-medium bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{kitchenOrders.length}</span></h2>
              {kitchenOrders.length === 0 ? <div className="bg-white rounded-2xl p-10 text-center text-slate-400 border border-dashed border-slate-300"><ChefHat size={40} className="mx-auto mb-2 opacity-50" /><p className="font-semibold">{t.noOrders}</p></div> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {kitchenOrders.map((order) => (
                    <div key={order.id} className={`bg-white rounded-2xl shadow-md border-l-8 overflow-hidden flex flex-col ${order.status === 'confirmed' ? 'border-blue-500' : 'border-orange-500'}`}>
                      <div className={`p-4 flex justify-between items-center ${order.status === 'confirmed' ? 'bg-blue-50' : 'bg-orange-50'}`}>
                        <div><p className="text-xs text-slate-500 font-medium">{new Date(order.created_at).toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'})}</p><h3 className="text-2xl font-bold text-slate-800">Tavolo {getTableName(order.table_id)}</h3></div>
                        <span className={`text-sm font-bold px-3 py-1 rounded-full ${order.status === 'confirmed' ? 'bg-blue-200 text-blue-800' : 'bg-orange-200 text-orange-800'}`}>{order.status === 'confirmed' ? (lang === 'it' ? 'NUOVO' : 'NEW') : (lang === 'it' ? 'IN PREP.' : 'PREP.')}</span>
                      </div>
                      <div className="p-4 flex-1 space-y-2">
                        {order.order_items.map((item) => ( <div key={item.id} className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg"><span className="bg-slate-200 text-slate-800 w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">{item.quantity}x</span><span className="font-semibold text-slate-700 text-sm">{getItemName(item.menu_items)}</span></div> ))}
                      </div>
                      <div className="p-4 bg-slate-50 border-t">
                        {order.status === 'confirmed' && <button onClick={() => updateOrderStatus(order.id, 'sent')} className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold hover:bg-orange-600 active:scale-95 transition flex items-center justify-center gap-2 text-sm"><ChefHat size={16} /> {lang === 'it' ? 'Inizia a Preparare' : 'Start Preparing'}</button>}
                        {order.status === 'sent' && <button onClick={() => updateOrderStatus(order.id, 'completed')} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 active:scale-95 transition flex items-center justify-center gap-2 text-sm"><CheckCircle size={16} /> {lang === 'it' ? 'Servito al Tavolo' : 'Served to Table'}</button>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}