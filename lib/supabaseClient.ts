import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Singleton pattern per evitare multiple connessioni in sviluppo e su Vercel
// Usiamo <any> per bypassare il controllo strict di TypeScript sui tipi del DB
let client: SupabaseClient<any> | undefined

export const getSupabaseClient = () => {
  if (!client) {
    client = createClient<any>(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10 // Evita flood di richieste in tempo reale
        }
      }
    })
  }
  return client
}

export const supabase = getSupabaseClient()