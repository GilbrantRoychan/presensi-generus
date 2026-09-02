'use client'

import { useState, useEffect, useRef, useSyncExternalStore } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Image from 'next/image'
import { QRCodeSVG } from 'qrcode.react'
import { toPng, toJpeg } from 'html-to-image'
import JSZip from 'jszip'
import { ArrowLeft, Search, Download, Folder, Users, Image as ImageIcon, Sparkles, Upload, X } from 'lucide-react'

// Interface untuk data Generus
interface Generus {
  id: string
  qr_code_id?: string
  nama: string
  kelompok: string
  kelas?: string
  jenis_kelamin?: string
}

const supabase = createClient()
const QR_DESIGN_STORAGE_KEY = 'qrcode-card-design'
const DESIGN_CHANGE_EVENT = 'qrcode-design-change'

const subscribeToDesign = (onChange: () => void) => {
  window.addEventListener('storage', onChange)
  window.addEventListener(DESIGN_CHANGE_EVENT, onChange)
  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener(DESIGN_CHANGE_EVENT, onChange)
  }
}

const getStoredDesign = () => localStorage.getItem(QR_DESIGN_STORAGE_KEY)
const getServerDesign = () => null

export default function QRCodePage() {
  const [generusList, setGenerusList] = useState<Generus[]>([])
  const [activeKelompok, setActiveKelompok] = useState<string>('Semua')
  const [searchQuery, setSearchQuery] = useState('')
  const [downloadFormat, setDownloadFormat] = useState<'png' | 'jpg'>('png')
  const [downloadingZip, setDownloadingZip] = useState(false)
  const [loading, setLoading] = useState(true)
  const designImage = useSyncExternalStore(subscribeToDesign, getStoredDesign, getServerDesign)
  const [designError, setDesignError] = useState('')

  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  useEffect(() => {
    const loadGenerus = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('generus')
        .select('*')
        .order('kelompok', { ascending: true })
        .order('nama', { ascending: true })

      if (data) {
        setGenerusList(data as Generus[])
      }
      setLoading(false)
    }

    loadGenerus()
  }, [])

  const handleDesignUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setDesignError('File harus berupa gambar.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result)
      try {
        localStorage.setItem(QR_DESIGN_STORAGE_KEY, dataUrl)
        window.dispatchEvent(new Event(DESIGN_CHANGE_EVENT))
        setDesignError('')
      } catch {
        setDesignError('Gambar terlalu besar untuk disimpan di browser.')
      }
    }
    reader.onerror = () => setDesignError('Gambar gagal dibaca.')
    reader.readAsDataURL(file)
  }

  const removeDesign = () => {
    localStorage.removeItem(QR_DESIGN_STORAGE_KEY)
    window.dispatchEvent(new Event(DESIGN_CHANGE_EVENT))
    setDesignError('')
  }

  const kelompokList = Array.from(new Set(generusList.map((g: Generus) => g.kelompok || 'Lainnya'))).sort()

  const filteredGenerus = generusList.filter((g: Generus) => {
    const matchKelompok = activeKelompok === 'Semua' || (g.kelompok || 'Lainnya') === activeKelompok
    const matchSearch =
      g.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.kelas && g.kelas.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchKelompok && matchSearch
  })

  // Pengelompokan data terstruktur dengan tipe Record<string, Generus[]>
  const groupedGenerus = filteredGenerus.reduce<Record<string, Generus[]>>((acc, curr) => {
    const k = curr.kelompok || 'Lainnya'
    if (!acc[k]) acc[k] = []
    acc[k].push(curr)
    return acc
  }, {})

  const downloadSingleCard = async (id: string, nama: string, format: 'png' | 'jpg') => {
    const node = cardRefs.current[id]
    if (!node) return

    try {
      const options = { quality: 0.95, pixelRatio: 3, backgroundColor: '#ffffff' }
      const dataUrl = format === 'png' ? await toPng(node, options) : await toJpeg(node, options)

      const link = document.createElement('a')
      const safeName = nama.replace(/[^a-zA-Z0-9]/g, '_')
      link.download = `QRCode_${safeName}.${format}`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error('Gagal mengunduh gambar QR Code:', err)
      alert('Gagal mengunduh gambar QR Code.')
    }
  }

  const downloadKelompokZip = async (kelompokName: string) => {
    const targetItems = groupedGenerus[kelompokName] || []
    if (targetItems.length === 0) return alert('Tidak ada data QR Code untuk diunduh!')

    setDownloadingZip(true)
    const zip = new JSZip()
    const folder = zip.folder(`QRCode_Kelompok_${kelompokName.replace(/[^a-zA-Z0-9]/g, '_')}`)
    let downloadedCount = 0

    try {
      for (const g of targetItems) {
        const node = cardRefs.current[g.id]
        if (node) {
          const options = { quality: 0.95, pixelRatio: 3, backgroundColor: '#ffffff' }
          const dataUrl =
            downloadFormat === 'png' ? await toPng(node, options) : await toJpeg(node, options)
          
          const base64Data = dataUrl.replace(/^data:image\/(png|jpeg);base64,/, '')
          const safeNama = g.nama.replace(/[^a-zA-Z0-9]/g, '_')
          folder?.file(`${safeNama}_${g.id}.${downloadFormat}`, base64Data, { base64: true })
          downloadedCount += 1
        }
      }

      if (downloadedCount === 0) {
        throw new Error('Tidak ada kartu QR Code yang berhasil dibuat.')
      }

      const content = await zip.generateAsync({ type: 'blob' })
      const objectUrl = URL.createObjectURL(content)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = `QR_Kelompok_${kelompokName.replace(/[^a-zA-Z0-9]/g, '_')}_${downloadFormat.toUpperCase()}.zip`
      link.click()
      URL.revokeObjectURL(objectUrl)
    } catch (err) {
      console.error('Gagal membuat ZIP:', err)
      alert('Terjadi kesalahan saat mengunduh file ZIP.')
    } finally {
      setDownloadingZip(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-7xl mx-auto px-3 pt-13 pb-4 sm:px-4 sm:pt-13 sm:pb-6 lg:px-6 lg:pt-13 lg:pb-6 space-y-4 sm:space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
        </Link>

        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-start sm:items-center gap-2">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 text-blue-600" /> Generasi QR Code Co-Card
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Unduh QR Code siap pakai atau cetak langsung untuk ditempel pada ID Card / Co-Card fisik peserta.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-xl self-start md:self-auto">
          <span className="text-xs font-semibold text-gray-500 px-2 flex items-center gap-1">
            <ImageIcon className="w-3.5 h-3.5" /> Format:
          </span>
          <button
            onClick={() => setDownloadFormat('png')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
              downloadFormat === 'png'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            PNG
          </button>
          <button
            onClick={() => setDownloadFormat('jpg')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
              downloadFormat === 'jpg'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            JPG
          </button>
        </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-blue-600" /> Desain Twibbon / Name Tag
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Upload gambar desain untuk mengganti latar kartu QR. Desain akan ikut tampil pada file hasil download.
            </p>
            {designError && <p className="text-xs text-red-600 mt-2">{designError}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <label className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4" />
              {designImage ? 'Ganti Desain' : 'Upload Desain'}
              <input type="file" accept="image/*" onChange={handleDesignUpload} className="sr-only" />
            </label>
            {designImage && (
              <button
                type="button"
                onClick={removeDesign}
                title="Hapus desain upload"
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4">
        <div className="flex items-center gap-2 overflow-x-auto rounded-2xl border border-slate-700 bg-slate-800/80 p-2 pb-3 scrollbar-none">
          <button
            onClick={() => setActiveKelompok('Semua')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition flex items-center gap-2 cursor-pointer ${
              activeKelompok === 'Semua'
                ? 'bg-blue-600 text-white border border-blue-400'
                : 'bg-slate-700 text-slate-100 hover:bg-slate-600 border border-slate-600'
            }`}
          >
            <Users className="w-4 h-4" /> Semua Kelompok ({generusList.length})
          </button>

          {kelompokList.map((kel) => {
            const count = generusList.filter((g: Generus) => (g.kelompok || 'Lainnya') === kel).length
            return (
              <button
                key={kel}
                onClick={() => setActiveKelompok(kel)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition flex items-center gap-2 cursor-pointer ${
                  activeKelompok === kel
                    ? 'bg-blue-600 text-white border border-blue-400'
                    : 'bg-slate-700 text-slate-100 hover:bg-slate-600 border border-slate-600'
                }`}
              >
                <Folder className="w-4 h-4 text-amber-500" /> {kel} ({count})
              </button>
            )
          })}
        </div>

        <div className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-100 relative">
          <Search className="w-4 h-4 absolute left-6 top-6 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nama atau kelas generus..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        </div>

        {loading ? (
        <div className="bg-white p-12 text-center rounded-2xl text-gray-400 text-sm">
          Memuat data QR Code...
        </div>
      ) : Object.keys(groupedGenerus).length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl text-gray-400 text-sm">
          Tidak ada data generus yang ditemukan.
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedGenerus).map(([kelompokName, items]: [string, Generus[]]) => (
            <div key={kelompokName} className="bg-blue-50 p-4 sm:p-6 rounded-2xl shadow-sm border border-blue-100 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-8 bg-blue-600 rounded-full"></span>
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">{kelompokName}</h2>
                    <p className="text-xs text-gray-400">{items.length} Peserta Generus</p>
                  </div>
                </div>

                <button
                  onClick={() => downloadKelompokZip(kelompokName)}
                  disabled={downloadingZip}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 shadow-sm disabled:bg-gray-300 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  {downloadingZip ? 'Proses ZIP...' : `Download Semua ${kelompokName} (.ZIP)`}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {items.map((g: Generus) => (
                  <div
                    key={g.id}
                    className="flex flex-col items-center bg-blue-100/70 p-4 rounded-xl border border-blue-200 space-y-4 transition"
                  >
                    {/* Menggunakan Tailwind v4 `w-55` (sebanding dengan 220px) */}
                    <div
                      ref={(el) => {
                        cardRefs.current[g.id] = el
                      }}
                      className={`relative isolate w-full max-w-55 overflow-hidden border border-gray-200 shadow-sm ${
                        designImage
                          ? 'aspect-[990/1600] border-0 bg-transparent shadow-none'
                          : 'bg-white p-4 sm:p-5 rounded-2xl flex flex-col items-center text-center space-y-3'
                      }`}
                    >
                      {designImage ? (
                        <>
                          <div className="absolute left-[15%] top-[35.6%] z-20 h-[calc(55%+16px)] w-[70%] overflow-hidden rounded-[8%] bg-white p-2 shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
                            <p className="absolute left-[5%] top-[6%] w-[90%] truncate text-center text-[clamp(8px,2.4vw,14px)] font-extrabold uppercase leading-none text-blue-700">
                              {g.kelompok || 'GENERUS'}
                            </p>
                            <div className="absolute left-[18.5%] top-[19%] flex aspect-square w-[63%] items-center justify-center rounded-[5%] bg-white p-[3%] shadow-[0_1px_8px_rgba(0,0,0,0.1)]">
                              <QRCodeSVG
                                value={g.qr_code_id || g.id}
                                size={1000}
                                level="H"
                                includeMargin={false}
                                style={{ width: '100%', height: '100%' }}
                              />
                            </div>
                            <div className="absolute left-[5%] top-[72.5%] w-[90%] text-center opacity-100">
                              <p className="line-clamp-2 text-[clamp(8px,2.4vw,14px)] font-extrabold uppercase leading-tight text-black">
                                {g.nama}
                              </p>
                              <p className="truncate text-[clamp(6px,1.6vw,10px)] font-semibold leading-none text-gray-500">
                                {g.kelas ? `Kelas ${g.kelas}` : '-'} {g.jenis_kelamin ? `• ${g.jenis_kelamin}` : ''}
                              </p>
                            </div>
                          </div>
                          <Image
                            src={designImage}
                            alt="Desain name tag"
                            fill
                            unoptimized
                            className="z-0 object-cover"
                          />
                        </>
                      ) : (
                        <>
                          <span className="relative z-10 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-extrabold uppercase tracking-widest border border-blue-100">
                            {g.kelompok || 'GENERUS'}
                          </span>

                          <div className="relative z-10 p-2.5 bg-white border border-gray-100 rounded-xl shadow-inner">
                            <QRCodeSVG
                              value={g.qr_code_id || g.id}
                              size={135}
                              level="H"
                              includeMargin={false}
                            />
                          </div>

                          <div className="relative z-10 w-full space-y-0.5 pt-1">
                            <h3 className="font-extrabold text-gray-900 text-base leading-tight tracking-tight line-clamp-2 uppercase">
                              {g.nama}
                            </h3>
                            <p className="text-xs font-semibold text-gray-500">
                              {g.kelas ? `Kelas ${g.kelas}` : '-'} {g.jenis_kelamin ? `• ${g.jenis_kelamin}` : ''}
                            </p>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Menggunakan Tailwind v4 `max-w-55` */}
                    <div className="flex items-center gap-2 w-full max-w-55">
                      <button
                        onClick={() => downloadSingleCard(g.id, g.nama, downloadFormat)}
                        className="w-full py-2 bg-white hover:bg-blue-50 text-blue-600 border border-blue-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download {downloadFormat.toUpperCase()}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
    </div>
  )
}