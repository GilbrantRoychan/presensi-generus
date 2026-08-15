import Link from 'next/link'
import { QrCode, ClipboardList, LogIn } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 border text-center space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Presensi Generus</h1>
          <p className="text-sm text-gray-500 mt-2">Sistem Kehadiran & Rekapitulasi Digital</p>
        </div>

        <div className="space-y-3 pt-4">
          <Link
            href="/login"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition"
          >
            <LogIn className="w-5 h-5" /> Portal Admin / Petugas
          </Link>

          <Link
            href="/rekap"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition"
          >
            <ClipboardList className="w-5 h-5" /> Lihat Rekap Kehadiran
          </Link>

          <Link
            href="/qrcode"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-900 transition"
          >
            <QrCode className="w-5 h-5" /> Portal Kartu QR Code
          </Link>
        </div>
      </div>
    </div>
  )
}