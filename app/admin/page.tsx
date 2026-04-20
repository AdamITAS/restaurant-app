"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Order, OrderItem, MenuItem, RestaurantTable } from '@/lib/types'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { 
  LogIn, ChefHat, CheckCircle, CreditCard, Receipt, 
  Clock, UtensilsCrossed, CircleDot, Table2, LogOut, Languages
} from 'lucide-react'

const ADMIN_PIN = "1234"

// Tipi estesi per il join
interface OrderWithItems extends Order {
  order_items: (OrderItem & { menu_items: MenuItem })[]
}

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [pinInput, setPinInput] = useState("")
  const [loading, setLoading] = useState(true)
  
  // Stati principali
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [kitchenOrders, setKitchenOrders] = useState<OrderWithItems[]>([])
  const [completedOrders, setCompletedOrders] = useState<OrderWithItems[]>([])
  
  const { lang, setLang, t } = useLanguage()

  const handleLogin = () => {
    if (pinInput === ADMIN_PIN) {
      setIsAuthenticated(true)
      setLoading(true)
    } else { 
      alert(t.wrongPin); 
      setPinInput("") 
    }
  }

  // Fetch di TUTTI i dati necessari
  const fetchDashboardData = async () => {
    try {
      // 1. Prendi tutti i tavoli
      const { data: tablesData, error: err1 } = await supabase
        .from('tables')
        .select('*')
        .order('number', { ascending: true })
      if (err1) throw err1
      if (tablesData) setTables(tablesData as RestaurantTable[])

      // 2. Prendi ordini per la CUCINA (confirmed, sent)
      const { data: kitchenData, error: err2 } = await supabase
        .from('orders')
        .select('*, order_items(*, menu_items(name, name_en))')
        .in('status', ['confirmed', 'sent'])
        .order('created_at', { ascending: true })
      if (err2) throw err2
      if (kitchenData) setKitchenOrders(kitchenData as OrderWithItems[])

      // 3. Prendi ordini COMPLETATI (per mostrare cosa stanno mangiando ai tavoli attivi)
      const { data: completedData, error: err3 } = await supabase
        .from('orders')
        .select('*, order_items(*, menu_items(name, name_en))')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
      if (err3) throw err3
      if (completedData) setCompletedOrders(completedData as OrderWithItems[])

    } catch (error: any) {
      console.error("Errore rete:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isAuthenticated) return
    fetchDashboardData()

    // Sottoscrizione Realtime unica e centralizzata
    const channel = supabase
      .channel('admin-dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => fetchDashboardData())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [isAuthenticated])

  // --- AZIONI ---

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
  }

  const handleRequestBill = async (tableId: string) => {
    await supabase.from('tables').update({ status: 'awaiting_payment' }).eq('id', tableId)
  }

  const handleConfirmPayment = async (tableId: string) => {
    // Calcola totale
    const { data: orders } = await supabase.from('orders').select('total').eq('table_id', tableId).eq('status', 'completed')
    const totalAmount = orders?.reduce((sum, order) => sum + order.total, 0) || 0
    
    // Registra pagamento
    await supabase.from('payments').insert([{ table_id: tableId, amount: totalAmount }])
    // Resetta tavolo
    await supabase.from('tables').update({ status: 'available' }).eq('id', tableId)
  }

  const getTableName = (tableId: string) => {
    const table = tables.find(t => t.id === tableId)
    return table ? table.number : '?'
  }

  const getItemName = (item: MenuItem) => {
    return lang === 'en' && item.name_en ? item.name_en : item.name
  }

  // --- COMPONENTI UI ---

  // Badge Status Tavolo
  const TableStatusBadge = ({ status }: { status: RestaurantTable['status'] }) => {
    const config = {
      available: { color: 'bg-emerald-100 text-emerald-700', label: lang === 'it' ? 'Libero' : 'Available', icon: <CheckCircle size={14} /> },
      active: { color: 'bg-amber-100 text-amber-700', label: lang === 'it' ? 'Occupato' : 'Active', icon: <UtensilsCrossed size={14} /> },
      awaiting_payment: { color: 'bg-purple-100 text-purple-700', label: lang === 'it' ? 'Da Pagare' : 'To Pay', icon: <CreditCard size={14} /> }
    }
    const c = config[status]
    return (
      <span className={`text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 ${c.color}`}>
        {c.icon} {c.label}
      </span>
    )
  }

  // --- RENDER PRINCIPALE ---

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-2xl text-center max-w-sm w-full">
          <LogIn size={40} className="mx-auto mb-4 text-slate-800" />
          <h1 className="text-2xl font-bold mb-6 text-slate-800">{t.kitchenAccess}</h1>
          <input 
            type="number" 
            value={pinInput} 
            onChange={(e) => setPinInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder={t.enterPin} 
            className="w-full text-center text-2xl tracking-[1em] p-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none mb-4"
          />
          <button onClick={handleLogin} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold text-xl hover:bg-emerald-700 active:scale-95 transition">
            {t.enter}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-20 shadow-lg">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <UtensilsCrossed size={24} className="text-emerald-400" /> 
          {lang === 'it' ? 'Gestione Ristorante' : 'Restaurant Manager'}
        </h1>
        <div className="flex items-center gap-4">
          <button onClick={() => setLang(lang === 'it' ? 'en' : 'it')} className="p-2 hover:bg-slate-800 rounded-lg transition flex items-center gap-2 text-sm font-medium">
            <Languages size={18} /> {lang === 'it' ? 'EN' : 'IT'}
          </button>
          <button onClick={() => setIsAuthenticated(false)} className="p-2 hover:bg-red-700 rounded-lg transition flex items-center gap-2 text-sm font-medium text-red-300">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-8">
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          </div>
        ) : (
          <>
            {/* ========================================= */}
            {/* SEZIONE 1: MAPPA TAVOLI (FLOOR PLAN)      */}
            {/* ========================================= */}
            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Table2 size={22} className="text-slate-500" /> {lang === 'it' ? 'Sala Ristorante' : 'Floor Plan'}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {tables.map(table => {
                  const tableCompletedOrders = completedOrders.filter(o => o.table_id === table.id)
                  const tableKitchenOrders = kitchenOrders.filter(o => o.table_id === table.id)
                  
                  return (
                    <div key={table.id} className={`rounded-2xl p-4 border-2 shadow-sm flex flex-col transition-colors duration-300 ${
                      table.status === 'available' ? 'bg-emerald-50 border-emerald-200' :
                      table.status === 'awaiting_payment' ? 'bg-purple-50 border-purple-300' :
                      'bg-amber-50 border-amber-200'
                    }`}>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-2xl font-bold text-slate-800">T{table.number}</span>
                        <TableStatusBadge status={table.status} />
                      </div>
                      
                      {/* Dettaglio ordini per tavoli occupati */}
                      {table.status !== 'available' && (
                        <div className="mt-auto space-y-2 text-xs border-t border-slate-200 pt-2">
                          {tableKitchenOrders.length > 0 && (
                            <div className="text-amber-700 font-semibold flex items-center gap-1">
                              <Clock size={12} /> {lang === 'it' ? `${tableKitchenOrders.length} in cucina` : `${tableKitchenOrders.length} in kitchen`}
                            </div>
                          )}
                          {tableCompletedOrders.length > 0 && (
                            <div className="text-emerald-700 font-semibold flex items-center gap-1">
                              <CheckCircle size={12} /> {lang === 'it' ? `${tableCompletedOrders.length} serviti` : `${tableCompletedOrders.length} served`}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Azioni Tavolo */}
                      <div className="mt-3">
                        {table.status === 'active' && (
                          <button 
                            onClick={() => handleRequestBill(table.id)}
                            className="w-full bg-purple-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-purple-700 flex items-center justify-center gap-1"
                          >
                            <Receipt size={12}/> {t.requestBillBtn}
                          </button>
                        )}
                        {table.status === 'awaiting_payment' && (
                          <button 
                            onClick={() => handleConfirmPayment(table.id)}
                            className="w-full bg-emerald-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-emerald-700 flex items-center justify-center gap-1"
                          >
                            <CreditCard size={12}/> {lang === 'it' ? 'Pagato' : 'Paid'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* ========================================= */}
            {/* SEZIONE 2: CODA CUCINA (KITCHEN DISPLAY)  */}
            {/* ========================================= */}
            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <ChefHat size={22} className="text-orange-500" /> {lang === 'it' ? 'Coda Cucina' : 'Kitchen Queue'}
                <span className="ml-2 text-sm font-medium bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{kitchenOrders.length}</span>
              </h2>
              
              {kitchenOrders.length === 0 ? (
                <div className="bg-white rounded-2xl p-10 text-center text-slate-400 border border-dashed border-slate-300">
                  <ChefHat size={40} className="mx-auto mb-2 opacity-50" />
                  <p className="font-semibold">{t.noOrders}</p>
                  <p className="text-xs">{t.noOrdersDesc}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {kitchenOrders.map((order) => (
                    <div key={order.id} className={`bg-white rounded-2xl shadow-md border-l-8 overflow-hidden flex flex-col ${
                      order.status === 'confirmed' ? 'border-blue-500' : 'border-orange-500'
                    }`}>
                      {/* Header Ordine */}
                      <div className={`p-4 flex justify-between items-center ${
                        order.status === 'confirmed' ? 'bg-blue-50' : 'bg-orange-50'
                      }`}>
                        <div>
                          <p className="text-xs text-slate-500 font-medium">{new Date(order.created_at).toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'})}</p>
                          <h3 className="text-2xl font-bold text-slate-800">Tavolo {getTableName(order.table_id)}</h3>
                        </div>
                        <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                          order.status === 'confirmed' ? 'bg-blue-200 text-blue-800' : 'bg-orange-200 text-orange-800'
                        }`}>
                          {order.status === 'confirmed' ? (lang === 'it' ? 'NUOVO' : 'NEW') : (lang === 'it' ? 'IN PREP.' : 'PREP.')}
                        </span>
                      </div>
                      
                      {/* Lista Piatti */}
                      <div className="p-4 flex-1 space-y-2">
                        {order.order_items.map((item) => (
                          <div key={item.id} className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg">
                            <span className="bg-slate-200 text-slate-800 w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                              {item.quantity}x
                            </span>
                            <span className="font-semibold text-slate-700 text-sm">{getItemName(item.menu_items)}</span>
                          </div>
                        ))}
                      </div>

                      {/* Azioni Cucina */}
                      <div className="p-4 bg-slate-50 border-t">
                        {order.status === 'confirmed' && (
                          <button 
                            onClick={() => updateOrderStatus(order.id, 'sent')}
                            className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold hover:bg-orange-600 active:scale-95 transition flex items-center justify-center gap-2 text-sm"
                          >
                            <ChefHat size={16} /> {lang === 'it' ? 'Inizia a Preparare' : 'Start Preparing'}
                          </button>
                        )}
                        {order.status === 'sent' && (
                          <button 
                            onClick={() => updateOrderStatus(order.id, 'completed')}
                            className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 active:scale-95 transition flex items-center justify-center gap-2 text-sm"
                          >
                            <CheckCircle size={16} /> {lang === 'it' ? 'Servito al Tavolo' : 'Served to Table'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ========================================= */}
            {/* SEZIONE 3: STATO AVANZAMENTO CLIENTI      */}
            {/* ========================================= */}
            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <CircleDot size={22} className="text-slate-500" /> {lang === 'it' ? 'Tavoli Consumando' : 'Dining Tables'}
              </h2>
              <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
                {completedOrders.length === 0 && kitchenOrders.length === 0 ? (
                   <p className="text-slate-400 text-center text-sm py-4">{lang === 'it' ? 'Nessun tavolo occupato al momento' : 'No occupied tables right now'}</p>
                ) : (
                  tables
                    .filter(t => t.status === 'active')
                    .map(table => {
                      const tOrders = completedOrders.filter(o => o.table_id === table.id)
                      return (
                        <div key={table.id} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                          <h4 className="font-bold text-slate-800 mb-1">Tavolo {table.number} <span className="text-xs font-normal text-emerald-600 ml-2">{lang === 'it' ? 'Sto consumando' : 'Currently dining'}</span></h4>
                          <div className="flex flex-wrap gap-2">
                            {tOrders.map(order => (
                              order.order_items.map(item => (
                                <span key={item.id} className="bg-slate-100 px-2 py-1 rounded text-xs text-slate-600">
                                  {item.quantity}x {getItemName(item.menu_items)}
                                </span>
                              ))
                            ))}
                          </div>
                        </div>
                      )
                    })
                )}
              </div>
            </section>

          </>
        )}
      </div>
    </div>
  )
}