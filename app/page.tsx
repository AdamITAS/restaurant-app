import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold mb-8 text-gray-900">🍕 Test Restaurant</h1>
      <p className="mb-6 text-gray-600">Select a table to view the menu:</p>
      
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((tableNum) => (
          <Link 
            key={tableNum} 
            href={`/table/${tableNum}`}
            className="bg-white shadow-md rounded-xl p-6 text-center text-xl font-semibold text-green-700 hover:bg-green-50 transition-colors border border-gray-200"
          >
            Tavolo {tableNum}
          </Link>
        ))}
      </div>
    </main>
  )
}