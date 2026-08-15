'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { QRCodeSVG } from 'qrcode.react'
import { QrCode, Printer } from 'lucide-react'

export default function QrCodePortalPage() {
  const supabase = createClient()
  const [generusList, setGenerusList] = useState<any[]>([])

  useEffect(() => {
    fetchGenerus()
  }, [])

  const fetchGenerus = async () => {
    // Hirarki pengurutan tetap konsisten
    const { data } = await supabase
      .from('generus')
      .select('*')
      .order('kelompok', { ascending: true })
      .order('nama', { ascending: true })

    if (data) setGenerusList(data)
  }

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Portal Kartu QR Code</h1>
          <p className="text-sm text-gray-500">Cetak kartu presensi anggota (Kode unik 4–5 Karakter)</p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          <Printer className="w-4 h-4" /> Cetak Semua Kartu
        </button>
      </div>

      {/* Grid Kartu QR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 print:grid-cols-3">
        {generusList.map((g) => (
          <div key={g.id} className="bg-white p-4 rounded-xl border-2 border-gray-200 text-center flex flex-col items-center space-y-3">
            <div className="p-2 bg-white border rounded-lg">
              <QRCodeSVG value={g.qr_code_id} size={130} />
            </div>
            <div>
              <p className="text-xs font-bold text-blue-600 tracking-wider">KODE: {g.qr_code_id}</p>
              <h3 className="font-bold text-gray-800 text-base">{g.nama}</h3>
              <p className="text-xs text-gray-500">{g.kelompok} • {g.kelas}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}