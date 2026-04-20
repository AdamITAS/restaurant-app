import { supabase } from '@/lib/supabaseClient'
import { MenuItem, MenuCategory } from '@/lib/types'
import CustomerMenuView from '@/app/components/CustomerMenuView'

async function getMenuData() {
  const { data: categories } = await supabase.from('menu_categories').select('*')
  const { data: items } = await supabase.from('menu_items').select('*')

  return { 
    categories: categories as MenuCategory[], 
    items: items as MenuItem[] 
  }
}

export default async function TablePage({ params }: { params: { id: string } }) {
  const { categories, items } = await getMenuData()
  const tableNumber = params.id

  return (
    <CustomerMenuView categories={categories} items={items} tableNumber={tableNumber} />
  )
}