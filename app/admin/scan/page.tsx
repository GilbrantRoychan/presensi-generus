'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { Camera, CheckCircle2, AlertCircle, X, UserCheck } from 'lucide-react'

interface Generus {
  id: string
  nama: string
  qr_code?: string
}

interface Acara {
  id: string
  nama_acara: string
}

export default function ScanPage() {
  const supabase = createClient()

  // State Utama
  const [acaraList, setAcaraList] = useState<Acara[]>([])
  const [generusList, setGenerusList] = useState<Generus[]>([])
  const [selectedAcara, setSelectedAcara] = useState<string>('')

  // State Form Manual (2 pilihan terpisah)
  const [selectedGenerusId, setSelectedGenerusId] = useState<string>('')
  const [selectedGenerusNama, setSelectedGenerusNama] = useState<string>('')

  // State Toast Notification Popup
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  })

  // Ref penanda agar scan tidak dieksekusi berulang kali bersamaan (Debounce)
  const isProcessing = useRef(false)

  useEffect(() => {
    fetchAcara()
    fetchGenerus()
  }, [])

  // Fungsi Tampil Toast Popup
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type })
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' })
    }, 3500)
  }

  // 1. Fetch Acara & Generus
  const fetchAcara = async () => {
    const { data } = await supabase.from('acara').select('id, nama_acara').order('created_at', { ascending: false })
    if (data && data.length > 0) {
      setAcaraList(data)
      setSelectedAcara(data[0].id) // Default acara terbaru
    }
  }

  const fetchGenerus = async () => {
    const { data } = await supabase.from('generus').select('id, nama, qr_code').order('nama', { ascending: true })
    if (data) setGenerusList(data)
  }

  // 2. Inisialisasi Scanner Kamera
  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'reader',
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
      },
      /* verbose= */ false
    )

    scanner.render(onScanSuccess, onScanFailure)

    return () => {
      scanner.clear().catch((error) => console.error('Gagal membersihkan scanner:', error))
    }
  }, [selectedAcara])

  // 3. Logika Proses Scan QR Code
  const onScanSuccess = async (decodedText: string) => {
    if (isProcessing.current) return
    isProcessing.current = true

    if (!selectedAcara) {
      showToast('Pilih acara terlebih dahulu sebelum melakukan scan!', 'error')
      setTimeout(() => { isProcessing.current = false }, 2000)
      return
    }

    const cleanCode = decodedText.trim()

    // Cari di database: Cek berdasarkan ID (UUID) ATAU Kolom QR Code Singkat
    const { data: foundGenerus, error } = await supabase
      .from('generus')
      .select('id, nama')
      .or(`id.eq.${cleanCode},qr_code.eq.${cleanCode}`)
      .maybeSingle()

    if (error || !foundGenerus) {
      showToast(`Kode QR (${cleanCode}) tidak terdaftar di sistem!`, 'error')
    } else {
      await submitPresensi(foundGenerus.id, foundGenerus.nama, 'Scan QR')
    }

    // Debounce 2.5 detik agar kamera tidak langsung me-rescan orang yang sama
    setTimeout(() => {
      isProcessing.current = false
    }, 2500)
  }

  const onScanFailure = (error: any) => {
    // Abaikan error per-frame pencarian biasa dari library html5-qrcode
  }

  // 4. Submit Presensi ke Database
  const submitPresensi = async (generusId: string, nama: string, metode: string) => {
    // Cek apakah sudah absen pada acara ini
    const { data: existing } = await supabase
      .from('presensi')
      .select('id')
      .eq('acara_id', selectedAcara)
      .eq('generus_id', generusId)
      .maybeSingle()

    if (existing) {
      showToast(`${nama} sudah melakukan presensi sebelumnya!`, 'error')
      resetFormManual()
      return
    }

    // Insert Presensi
    const { error: insertError } = await supabase.from('presensi').insert([
      {
        acara_id: selectedAcara,
        generus_id: generusId,
        nama_generus: nama,
        metode_absen: metode,
        waktu_absen: new Date().toISOString(),
      },
    ])

    if (insertError) {
      showToast(`Gagal menyimpan data: ${insertError.message}`, 'error')
    } else {
      showToast(`Berhasil! Presensi atas nama ${nama} tersimpan.`, 'success')
      resetFormManual()
    }
  }

  // 5. Submit Manual
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAcara) return showToast('Pilih acara terlebih dahulu!', 'error')
    if (!selectedGenerusId || !selectedGenerusNama) return showToast('Pilih data generus secara lengkap!', 'error')

    await submitPresensi(selectedGenerusId, selectedGenerusNama, 'Manual Admin')
  }

  // Reset form manual
  const resetFormManual = () => {
    setSelectedGenerusId('')
    setSelectedGenerusNama('')
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      
      {/* Toast Notification Popup Floating */}
      {toast.show && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md animate-in fade-in slide-in-from-top-4 duration-300">
          <div
            className={`p-4 rounded-2xl shadow-xl border flex items-center justify-between gap-3 ${
              toast.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-red-600 text-white border-red-500'
            }`}
          >
            <div className="flex items-center gap-2.5 text-sm font-semibold">
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0" />
              )}
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => setToast({ ...toast, show: false })}
              className="p-1 rounded-lg hover:bg-white/20 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 pt-8 space-y-6">
        
        {/* Header & Input Pilihan Acara */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
          <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider">
            Pilih Acara Presensi
          </label>
          <select
            value={selectedAcara}
            onChange={(e) => setSelectedAcara(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
          >
            {acaraList.length === 0 ? (
              <option value="">-- Belum Ada Acara --</option>
            ) : (
              acaraList.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nama_acara}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Kolom A: Kamera Pemindai QR */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-slate-800 font-extrabold text-sm border-b border-slate-100 pb-3">
              <Camera className="w-4 h-4 text-blue-600" />
              <span>Pemindai Kamera QR Code</span>
            </div>

            <div id="reader" className="overflow-hidden rounded-xl border border-slate-200" />
          </div>

          {/* Kolom B: Presensi Manual */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-slate-800 font-extrabold text-sm border-b border-slate-100 pb-3">
              <UserCheck className="w-4 h-4 text-blue-600" />
              <span>Input Presensi Manual</span>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4 text-xs sm:text-sm">
              {/* Dropdown 1: Pilih ID */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Pilih ID Generus</label>
                <select
                  value={selectedGenerusId}
                  onChange={(e) => {
                    const idSelected = e.target.value
                    setSelectedGenerusId(idSelected)
                    const found = generusList.find((g) => g.id === idSelected)
                    if (found) setSelectedGenerusNama(found.nama)
                    else setSelectedGenerusNama('')
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                >
                  <option value="">-- Pilih ID Generus --</option>
                  {generusList.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.qr_code ? `${g.qr_code} (${g.id.slice(0, 6)}...)` : g.id}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dropdown 2: Pilih Nama */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Pilih Nama Generus</label>
                <select
                  value={selectedGenerusNama}
                  onChange={(e) => {
                    const namaSelected = e.target.value
                    setSelectedGenerusNama(namaSelected)
                    const found = generusList.find((g) => g.nama === namaSelected)
                    if (found) setSelectedGenerusId(found.id)
                    else setSelectedGenerusId('')
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                >
                  <option value="">-- Pilih Nama Generus --</option>
                  {generusList.map((g) => (
                    <option key={g.id} value={g.nama}>
                      {g.nama}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={!selectedGenerusId}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl font-bold transition shadow-md shadow-blue-500/20"
              >
                Simpan Presensi Manual
              </button>
            </form>
          </div>

        </div>
      </main>
    </div>
  )
}