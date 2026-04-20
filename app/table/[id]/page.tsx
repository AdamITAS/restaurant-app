import { supabase } from '@/lib/supabaseClient'
import { MenuItem, MenuCategory } from '@/lib/types'
import CustomerMenuView from '@/app/components/CustomerMenuView'

// Fetch dei dati dal database
async function getMenuData() {
  const { data: categories } = await supabase.from('menu_categories').select('*')
  const { data: items } = await supabase.from('menu_items').select('*')

  return { 
    categories: categories as MenuCategory[], 
    items: items as MenuItem[] 
  }
}

export default async function TablePage({ params }: { params: Promise<{ id: string }> }) {
  const { categories, items } = await getMenuData()
  
  // Next.js 16 richiede l'await per leggere i parametri dell'URL
  const { id: tableNumber } = await params 

  return (
    <CustomerMenuView categories={categories} items={items} tableNumber={tableNumber} />
  )
}