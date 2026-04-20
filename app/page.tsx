"use client"

import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { UtensilsCrossed, ChefHat, QrCode } from 'lucide-react'

export default function Home() {
  const { lang, setLang } = useLanguage()
  const isIt = lang === 'it'

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-4 right-4 flex items-center gap-3 z-10">
        <Link href="/admin" className="text-slate-400 hover:text-slate-700 text-xs font-medium flex items-center gap-1 bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-200 transition-colors"><ChefHat size={14} /> {isIt ? 'Cucina' : 'Kitchen'}</Link>
        <button onClick={() => setLang(lang === 'it' ? 'en' : 'it')} className="p-2 rounded-full hover:bg-slate-100 text-lg transition">{lang === 'it' ? '🇬🇧' : '🇮🇹'}</button>
      </div>

      <div className="relative z-10 text-center mb-10 max-w-md">
        <div className="inline-block p-4 bg-emerald-100 rounded-full mb-4"><UtensilsCrossed size={40} className="text-emerald-600" /></div>
        <h1 className="text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">{isIt ? 'RistoApp' : 'RistoApp'}</h1>
        <p className="text-md text-slate-500">{isIt ? 'I clienti scansioneranno il QR Code sul loro tavolo per ordinare.' : 'Customers will scan the QR Code on their table to order.'}</p>
      </div>
      
      <div className="relative z-10 bg-white p-6 rounded-2xl shadow-md border border-slate-100 w-full max-w-sm">
        <div className="flex items-center gap-2 mb-4 text-slate-800 font-bold"><QrCode size={18}/> {isIt ? 'Simulazione QR Code (Solo Test)' : 'QR Code Simulation (Test Only)'}</div>
        <div className="grid grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((tableNum) => (
            <Link key={tableNum} href={`/table/${tableNum}`} className="bg-slate-100 p-3 rounded-xl text-center font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-all text-sm active:scale-95">
              T{tableNum}
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}