import Link from 'next/link'
import { QrCode, ClipboardList, LogIn, Sparkles } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-between text-slate-100 font-sans">
      {/* Top Header Identity */}
      <header className="pt-8 text-center px-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5" /> Sistem Kehadiran Digital
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
          GENERUS TAMANTIRTO
        </h1>
        <p className="text-slate-400 mt-2 text-sm sm:text-base max-w-md mx-auto">
          Portal Layanan Presensi, Kartu QR Code & Rekapitulasi Data Kehadiran
        </p>
      </header>

      {/* Main Action Cards */}
      <main className="max-w-md w-full mx-auto px-4 py-8">
        <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-2xl p-6 sm:p-8 border border-slate-700 space-y-4">
          <Link
            href="/login"
            className="w-full flex items-center justify-between p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold shadow-lg shadow-blue-900/30 transition transform hover:-translate-y-0.5"
          >
            <span className="flex items-center gap-3">
              <LogIn className="w-5 h-5" /> Portal Admin / Petugas
            </span>
            <span className="text-xs bg-blue-700/50 px-2.5 py-1 rounded-md">Masuk</span>
          </Link>

          <Link
            href="/rekap"
            className="w-full flex items-center justify-between p-4 bg-slate-700/80 hover:bg-slate-700 text-slate-100 rounded-xl font-semibold border border-slate-600 transition transform hover:-translate-y-0.5"
          >
            <span className="flex items-center gap-3">
              <ClipboardList className="w-5 h-5 text-emerald-400" /> Lihat Rekap Kehadiran
            </span>
            <span className="text-xs bg-slate-800 px-2.5 py-1 rounded-md text-slate-400">Publik</span>
          </Link>

          <Link
            href="/qrcode"
            className="w-full flex items-center justify-between p-4 bg-slate-700/80 hover:bg-slate-700 text-slate-100 rounded-xl font-semibold border border-slate-600 transition transform hover:-translate-y-0.5"
          >
            <span className="flex items-center gap-3">
              <QrCode className="w-5 h-5 text-amber-400" /> Portal Kartu QR Code
            </span>
            <span className="text-xs bg-slate-800 px-2.5 py-1 rounded-md text-slate-400">Cetak</span>
          </Link>
        </div>
      </main>

      {/* Footer Identity */}
      <footer className="pb-6 text-center text-xs text-slate-500">
        Generus Tamantirto 2026
      </footer>
    </div>
  )
}