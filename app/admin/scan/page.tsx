'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { QRCodeSVG } from 'qrcode.react'
import { toPng } from 'html-to-image'
import JSZip from 'jszip'
import { Download, FolderDown, Search, User, QrCode, Sparkles } from 'lucide-react'

export default function AdminScanPage() {
  const supabase = createClient()
  const [generusList, setGenerusList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [downloadingGroup, setDownloadingGroup] = useState<string | null>(null)

  // Ref penampung elemen DOM QR Card untuk dikonversi jadi PNG
  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  useEffect(() => {
    fetchGenerus()
  }, [])

  const fetchGenerus = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('generus')
      .select('*')
      .order('kelompok', { ascending: true })
      .order('nama', { ascending: true })

    if (!error && data) {
      setGenerusList(data)
    }
    setLoading(false)
  }

  // Filter pencarian nama/kelas
  const filteredList = generusList.filter(
    (g) =>
      g.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.kelas.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Pengelompokan Data berdasarkan nama Kelompok
  const groupedGenerus = filteredList.reduce((acc: { [key: string]: any[] }, item) => {
    const kelompokName = item.kelompok || 'Lainnya'
    if (!acc[kelompokName]) {
      acc[kelompokName] = []
    }
    acc[kelompokName].push(item)
    return acc
  }, {})

  // Download QR Card Satuan (PNG)
  const handleDownloadSingle = async (id: string, nama: string) => {
    const node = cardRefs.current[id]
    if (!node) return

    try {
      const dataUrl = await toPng(node, { pixelRatio: 3, cacheBust: true })
      const link = document.createElement('a')
      link.download = `QR_${nama.replace(/[^a-zA-Z0-9]/g, '_')}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error('Gagal mengunduh gambar QR:', err)
      alert('Gagal mengunduh gambar QR Code.')
    }
  }

  // Download Seluruh QR Card dalam 1 Kelompok (Zip PNG)
  const handleDownloadGroupZip = async (kelompokName: string, items: any[]) => {
    setDownloadingGroup(kelompokName)
    const zip = new JSZip()
    const folder = zip.folder(`QR_Code_${kelompokName.replace(/[^a-zA-Z0-9]/g, '_')}`)

    try {
      for (const item of items) {
        const node = cardRefs.current[item.id]
        if (node) {
          const dataUrl = await toPng(node, { pixelRatio: 3, cacheBust: true })
          const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '')
          const fileName = `${item.nama.replace(/[^a-zA-Z0-9]/g, '_')}_${item.kelas || 'Generus'}.png`
          folder?.file(fileName, base64Data, { base64: true })
        }
      }

      const content = await zip.generateAsync({ type: 'blob' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(content)
      link.download = `QR_Code_Kelompok_${kelompokName.replace(/[^a-zA-Z0-9]/g, '_')}.zip`
      link.click()
    } catch (err) {
      console.error('Gagal membuat file ZIP kelompok:', err)
      alert('Terjadi kesalahan saat mengunduh paket QR Kelompok.')
    } finally {
      setDownloadingGroup(null)
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <QrCode className="w-7 h-7 text-blue-600" /> Generasi & Export QR Code Co-Card
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Unduh kartu QR Code siap cetak atau desain ulang per individu dan per kelompok.
          </p>
        </div>

        {/* Bar Pencarian */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nama atau kelas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-500 bg-white rounded-2xl border border-gray-100">
          Memuat data generus dan QR Code...
        </div>
      ) : Object.keys(groupedGenerus).length === 0 ? (
        <div className="p-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-100">
          Tidak ada data generus ditemukan.
        </div>
      ) : (
        /* Daftar Per Kelompok */
        Object.entries(groupedGenerus).map(([kelompokName, items]) => (
          <div key={kelompokName} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-5">
            {/* Header Kelompok & Tombol Download Kelompok */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-4 border-b border-gray-100 gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-7 bg-blue-600 rounded-full inline-block"></span>
                <h2 className="text-xl font-bold text-gray-800">
                  Kelompok {kelompokName}
                </h2>
                <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 font-semibold rounded-full text-xs">
                  {items.length} Generus
                </span>
              </div>

              <button
                onClick={() => handleDownloadGroupZip(kelompokName, items)}
                disabled={downloadingGroup === kelompokName}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 shadow-sm disabled:bg-gray-300"
              >
                <FolderDown className="w-4 h-4" />
                {downloadingGroup === kelompokName
                  ? 'Mengepak ZIP...'
                  : `Download Semua QR (${kelompokName})`}
              </button>
            </div>

            {/* Grid QR Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {items.map((g) => (
                <div
                  key={g.id}
                  className="bg-gray-50/50 p-4 rounded-xl border border-gray-200/80 flex flex-col items-center justify-between gap-4 transition hover:shadow-md"
                >
                  {/* TAMPILAN ELEMEN CARD KHUSUS DOWNLOAD (Rasio & Tipografi Ideal untuk Co-Card) */}
                  <div
                    ref={(el) => {
                      cardRefs.current[g.id] = el
                    }}
                    className="w-full bg-white p-5 rounded-2xl border-2 border-gray-200 flex flex-col items-center text-center shadow-sm relative overflow-hidden"
                    style={{ minWidth: '240px' }}
                  >
                    {/* Header Decorative Accent */}
                    <div className="absolute top-0 left-0 right-0 h-3 bg-linear-to-r from-blue-600 to-indigo-600"></div>

                    {/* QR Code Container */}
                    <div className="p-3 bg-white border border-gray-100 rounded-xl shadow-inner mt-2 mb-3">
                      <QRCodeSVG
                        value={g.id}
                        size={150}
                        level="H"
                        includeMargin={false}
                      />
                    </div>

                    {/* Informasi Identitas Disesuaikan Proporsi Font-nya */}
                    <div className="w-full space-y-1 mt-1">
                      {/* Nama Generus */}
                      <h3 className="text-base font-extrabold text-gray-900 leading-tight uppercase tracking-tight line-clamp-2 px-1">
                        {g.nama}
                      </h3>

                      {/* Kelompok */}
                      <p className="text-xs font-bold text-blue-600 tracking-wide uppercase">
                        KELOMPOK {g.kelompok || '-'}
                      </p>

                      {/* Sub-Info (Kelas & Jenis Kelamin) */}
                      <div className="pt-2 flex items-center justify-center gap-2 text-[10px] font-medium text-gray-500 uppercase border-t border-gray-100 mt-2">
                        <span>{g.kelas || 'Generus'}</span>
                        <span>•</span>
                        <span>{g.jenis_kelamin || '-'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Tombol Download Satuan */}
                  <button
                    onClick={() => handleDownloadSingle(g.id, g.nama)}
                    className="w-full py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5 text-gray-600" /> Download PNG
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}