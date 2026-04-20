"use client"

import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { UtensilsCrossed, ChefHat } from 'lucide-react'

export default function Home() {
  const { lang, setLang } = useLanguage()
  
  // Testo semplice in linea per la homepage, non riempiamo il file traduzioni per 4 parole
  const isIt = lang === 'it'

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Sfondo decorativo */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center_/_1px,_#e2e8f0_1px,_transparent_1px)] [background-size:24px_24px] opacity-50 pointer-events-none"></div>

      {/* Bottoni Lingua e Admin in alto */}
      <div className="absolute top-4 right-4 flex items-center gap-3 z-10">
        <Link 
          href="/admin" 
          className="text-slate-400 hover:text-slate-700 text-xs font-medium flex items-center gap-1 bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-200 transition-colors"
        >
          <ChefHat size={14} /> {isIt ? 'Cucina' : 'Kitchen'}
        </Link>
        <button 
          onClick={() => setLang(lang === 'it' ? 'en' : 'it')} 
          className="p-2 rounded-full hover:bg-slate-100 text-lg transition"
        >
          {lang === 'it' ? '🇬🇧' : '🇮🇹'}
        </button>
      </div>

      {/* Contenuto Principale */}
      <div className="relative z-10 text-center mb-12">
        <div className="inline-block p-4 bg-emerald-100 rounded-full mb-4">
          <UtensilsCrossed size={40} className="text-emerald-600" />
        </div>
        <h1 className="text-5xl font-extrabold text-slate-900 mb-3 tracking-tight">
          {isIt ? 'Buon Appetito!' : 'Enjoy your meal!'}
        </h1>
        <p className="text-lg text-slate-500 max-w-md mx-auto">
          {isIt ? 'Seleziona il tuo tavolo per visualizzare il menu e ordinare.' : 'Select your table to view the menu and order.'}
        </p>
      </div>
      
      {/* Griglia Tavoli */}
      <div className="relative z-10 grid grid-cols-2 md:grid-cols-3 gap-5 max-w-sm w-full">
        {[1, 2, 3, 4, 5].map((tableNum) => (
          <Link 
            key={tableNum} 
            href={`/table/${tableNum}`}
            className="bg-white shadow-sm rounded-2xl p-6 text-center font-bold text-slate-800 hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-lg hover:-translate-y-1 transition-all border border-slate-100 text-lg flex items-center justify-center gap-2 active:scale-95"
          >
            {isIt ? 'Tavolo' : 'Table'} {tableNum}
          </Link>
        ))}
      </div>

      {/* Footer credit */}
      <p className="absolute bottom-4 text-slate-300 text-xs">Powered by RistoApp</p>
    </main>
  )
}