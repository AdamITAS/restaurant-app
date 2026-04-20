"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Order, OrderItem, MenuItem, RestaurantTable } from '@/lib/types'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { LogIn, Bell, ChefHat, CheckCircle, Loader2, CreditCard, Receipt } from 'lucide-react'

const ADMIN_PIN = "1234"

interface OrderWithItems extends Order {
  order_items: (OrderItem & { menu_items: MenuItem })[]
  tables: Pick<RestaurantTable, 'number' | 'status'>
}

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [pinInput, setPinInput] = useState("")
  const [activeOrders, setActiveOrders] = useState<OrderWithItems[]>([])
  const [tablesToPay, setTablesToPay] = useState<RestaurantTable[]>([])
  const [loading, setLoading] = useState(true)
  const { lang, setLang, t } = useLanguage()

  const handleLogin = () => {
    if (pinInput === ADMIN_PIN) { setIsAuthenticated(true); setLoading(true) }
    else { alert(t.wrongPin); setPinInput("") }
  }

  const fetchData = async () => {
    try {
      const { data: ordersData, error: err1 } = await supabase.from('orders').select('*, order_items(*, menu_items(name, name_en)), tables(number, status)').in('status', ['confirmed', 'sent']).order('created_at', { ascending: true })
      if (err1) throw err1
      if (ordersData) setActiveOrders(ordersData as OrderWithItems[])

      const { data: tablesData, error: err2 } = await supabase.from('tables').select('*').eq('status', 'awaiting_payment')
      if (err2) throw err2
      if (tablesData) setTablesToPay(tablesData as RestaurantTable[])
    } catch (error: any) {
      console.error("Network error:", error)
      alert("Error fetching data: " + error.message)
    } finally { setLoading(false) }
  }

  useEffect(() => {
    if (!isAuthenticated) return
    fetchData()
    const channel = supabase.channel('admin-channel').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchData()).on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, () => fetchData()).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [isAuthenticated])

  const updateOrderStatus = async (orderId: string, newStatus: string) => { await supabase.from('orders').update({ status: newStatus }).eq('id', orderId) }
  
  const handleRequestBill = async (tableId: string) => { await supabase.from('tables').update({ status: 'awaiting_payment' }).eq('id', tableId) }
  
  const handleConfirmPayment = async (tableId: string) => {
    const { data: orders } = await supabase.from('orders').select('total').eq('table_id', tableId).eq('status', 'completed')
    const totalAmount = orders?.reduce((sum, order) => sum + order.total, 0) || 0
    await supabase.from('payments').insert([{ table_id: tableId, amount: totalAmount }])
    await supabase.from('tables').update({ status: 'available' }).eq('id', tableId)
    alert(t.paymentConfirmed + ` €${totalAmount.toFixed(2)}`)
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-2xl text-center max-w-sm w-full">
          <LogIn size={40} className="mx-auto mb-4 text-slate-800" />
          <h1 className="text-2xl font-bold mb-6 text-slate-800">{t.kitchenAccess}</h1>
          <input type="number" value={pinInput} onChange={(e) => setPinInput(e.target.value)} placeholder={t.enterPin} className="w-full text-center text-2xl tracking-[1em] p-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none mb-4" />
          <button onClick={handleLogin} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold text-xl hover:bg-emerald-700">{t.enter}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2"><ChefHat size={32} className="text-emerald-600" /> {t.kitchen}</h1>
          <div className="flex items-center gap-4">
            <button onClick={() => setLang(lang === 'it' ? 'en' : 'it')} className="text-2xl">{lang === 'it' ? '🇬🇧' : '🇮🇹'}</button>
            <button onClick={() => setIsAuthenticated(false)} className="text-sm text-slate-500 hover:text-red-500 font-medium">{t.logout}</button>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-slate-400" size={40} /></div>
        ) : (
          <>
            {tablesToPay.length > 0 && (
              <div className="mb-10 bg-purple-50 p-6 rounded-2xl border-2 border-purple-200">
                <h2 className="text-xl font-bold mb-4 text-purple-800 flex items-center gap-2"><CreditCard size={24}/> {t.awaitingPayment}</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {tablesToPay.map(table => (
                    <div key={table.id} className="bg-white p-4 rounded-xl shadow-sm flex flex-col items-center justify-center text-center">
                      <p className="text-2xl font-bold text-slate-800 mb-4">{t.tableWord} {table.number}</p>
                      <button onClick={() => handleConfirmPayment(table.id)} className="w-full bg-purple-600 text-white py-3 rounded-xl font-semibold hover:bg-purple-700 flex items-center justify-center gap-2"><Receipt size={18} /> {t.confirmPayment}</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <h2 className="text-xl font-bold mb-4 text-slate-800">Ordini</h2>
            {activeOrders.length === 0 ? (
              <div className="text-center py-20 text-slate-400"><Bell size={48} className="mx-auto mb-4" /><p className="text-xl font-semibold">{t.noOrders}</p><p className="text-sm">{t.noOrdersDesc}</p></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeOrders.map((order) => (
                  <div key={order.id} className={`bg-white rounded-2xl shadow-sm border-l-8 ${order.status === 'confirmed' ? 'border-blue-500' : 'border-orange-500'} p-5 flex flex-col`}>
                    <div className="flex justify-between items-center mb-4">
                      <span className={`text-sm font-bold px-3 py-1 rounded-full ${order.status === 'confirmed' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                        {order.status === 'confirmed' ? t.newOrder : t.preparing}
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-4">{t.tableWord} {order.tables.number}</h2>
                    <div className="flex-1 space-y-2 mb-6">
                      {order.order_items.map((item) => (
                        <div key={item.id} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                          <span className="font-semibold text-slate-700">{item.quantity}x {lang === 'en' && item.menu_items.name_en ? item.menu_items.name_en : item.menu_items.name}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-auto space-y-2">
                      {order.status === 'confirmed' && (
                        <button onClick={() => updateOrderStatus(order.id, 'sent')} className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 flex items-center justify-center gap-2"><ChefHat size={18} /> {t.startPreparing}</button>
                      )}
                      {order.status === 'sent' && (
                        <>
                          <button onClick={() => updateOrderStatus(order.id, 'completed')} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 flex items-center justify-center gap-2"><CheckCircle size={18} /> {t.served}</button>
                          <button onClick={() => handleRequestBill(order.table_id)} className="w-full bg-slate-200 text-slate-700 py-2 rounded-xl text-sm font-semibold hover:bg-slate-300">{t.requestBillBtn}</button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}