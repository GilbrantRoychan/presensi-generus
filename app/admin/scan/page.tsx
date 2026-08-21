'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { Camera, UserCheck, UserPlus, Calendar, CheckCircle2, AlertCircle, X, Filter } from 'lucide-react'

export default function AdminScanPage() {
  const supabase = createClient()
  const [acaraList, setAcaraList] = useState<any[]>([])
  const [selectedAcara, setSelectedAcara] = useState<string>('')
  const [generusList, setGenerusList] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'ada' | 'baru'>('ada')
  
  // State Input Manual Data Ada
  const [selectedKelompokFilter, setSelectedKelompokFilter] = useState<string>('')
  const [selectedGenerusId, setSelectedGenerusId] = useState<string>('')

  // State Form Generus Baru
  const [namaBaru, setNamaBaru] = useState('')
  const [kelompokBaru, setKelompokBaru] = useState('Gonjen 1')
  const [jkBaru, setJkBaru] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki')
  const [kelasBaru, setKelasBaru] = useState('Pra Remaja')

  // State Toast Notification Floating (Popup)
  const [toast, setToast] = useState<{ show: boolean; text: string; type: 'success' | 'error' }>({
    show: false,
    text: '',
    type: 'success'
  })

  // Ref penanda cegah pindaian berulang beruntun (Debounce)
  const isProcessing = useRef(false)

  useEffect(() => {
    fetchAcara()
    fetchGenerus()
  }, [])

  // Fungsi Tampil Toast Notification Singkat
  const showToast = (text: string, type: 'success' | 'error') => {
    setToast({ show: true, text, type })
    setTimeout(() => {
      setToast({ show: false, text: '', type: 'success' })
    }, 3200)
  }

  // Scanner Kamera
  useEffect(() => {
    if (!selectedAcara) return

    const scanner = new Html5QrcodeScanner(
      'reader',
      { fps: 10, qrbox: { width: 250, height: 250 }, rememberLastUsedCamera: true },
      false
    )

    scanner.render(
      async (decodedText) => {
        await handleProcessPresensiByQR(decodedText)
      },
      () => {}
    )

    return () => {
      scanner.clear().catch(() => {})
    }
  }, [selectedAcara])

  const fetchAcara = async () => {
    const { data } = await supabase.from('acara').select('*').order('tanggal', { ascending: false })
    if (data && data.length > 0) {
      setAcaraList(data)
      setSelectedAcara(data[0].id)
    }
  }

  const fetchGenerus = async () => {
    const { data } = await supabase
      .from('generus')
      .select('*')
      .order('kelompok', { ascending: true })
      .order('nama', { ascending: true })
    if (data) setGenerusList(data)
  }

  // Ambil daftar unik kelompok secara otomatis dari data generus
  const kelompokOptions = Array.from(new Set(generusList.map((g) => g.kelompok))).filter(Boolean)

  // Filter daftar generus berdasarkan kelompok yang dipilih
  const filteredGenerusList = selectedKelompokFilter
    ? generusList.filter((g) => g.kelompok === selectedKelompokFilter)
    : generusList

  // Reset Semua Form Input Manual
  const resetForm = () => {
    setSelectedGenerusId('')
    setNamaBaru('')
    setKelompokBaru('Gonjen 1')
    setJkBaru('Laki-laki')
    setKelasBaru('Pra Remaja')
  }

  // Logika Pemrosesan QR Code
  const handleProcessPresensiByQR = async (rawCode: string) => {
    if (isProcessing.current) return
    isProcessing.current = true

    if (!selectedAcara) {
      showToast('Pilih acara terlebih dahulu!', 'error')
      setTimeout(() => { isProcessing.current = false }, 2000)
      return
    }

    const cleanCode = rawCode.trim()

    const { data: gen, error } = await supabase
      .from('generus')
      .select('id, nama')
      .or(`qr_code_id.eq.${cleanCode},id.eq.${cleanCode}`)
      .maybeSingle()

    if (error || !gen) {
      showToast(`Kode QR (${cleanCode}) tidak ditemukan!`, 'error')
    } else {
      await submitPresensi(gen.id, gen.nama, 'QR Scan')
    }

    setTimeout(() => {
      isProcessing.current = false
    }, 2500)
  }

  // Submit Presensi
  const submitPresensi = async (generusId: string, nama: string, metode: 'QR Scan' | 'Manual Admin') => {
    const { data: existing } = await supabase
      .from('presensi')
      .select('id')
      .eq('acara_id', selectedAcara)
      .eq('generus_id', generusId)
      .maybeSingle()

    if (existing) {
      showToast(`${nama} sudah tercatat hadir sebelumnya!`, 'error')
      resetForm()
      return
    }

    const { error } = await supabase.from('presensi').insert({
      generus_id: generusId,
      acara_id: selectedAcara,
      status: 'Hadir',
      metode: metode
    })

    if (error) {
      showToast(`Gagal mencatat presensi: ${error.message}`, 'error')
    } else {
      showToast(`Berhasil! ${nama} tercatat Hadir (${metode}).`, 'success')
      resetForm()
    }
  }

  // Submit Manual Data Ada
  const handleManualAdaSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAcara || !selectedGenerusId) return
    const gen = generusList.find((g) => g.id === selectedGenerusId)
    if (gen) await submitPresensi(gen.id, gen.nama, 'Manual Admin')
  }

  // Submit Manual Data Baru
  const handleManualBaruSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAcara) return

    const generatedQr = `GEN-${Math.floor(1000 + Math.random() * 9000)}`

    const { data: newGen, error } = await supabase
      .from('generus')
      .insert({
        nama: namaBaru,
        kelompok: kelompokBaru,
        jenis_kelamin: jkBaru,
        kelas: kelasBaru,
        qr_code_id: generatedQr
      })
      .select()
      .single()

    if (error || !newGen) {
      showToast('Gagal menambah generus baru.', 'error')
      return
    }

    await fetchGenerus()
    await submitPresensi(newGen.id, newGen.nama, 'Manual Admin')
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6 relative">
      
      {/* Toast Popup Notification Floating */}
      {toast.show && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md transition-all duration-300">
          <div
            className={`p-4 rounded-2xl shadow-xl border flex items-center justify-between gap-3 text-white ${
              toast.type === 'success' ? 'bg-emerald-600 border-emerald-500' : 'bg-red-600 border-red-500'
            }`}
          >
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0" />
              )}
              <span>{toast.text}</span>
            </div>
            <button onClick={() => setToast({ ...toast, show: false })} className="p-1 hover:bg-white/20 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Bagian Pilihan Acara */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
        <label className="flex items-center gap-2 text-lg font-bold text-gray-800 mb-3">
          <Calendar className="w-5 h-5 text-blue-600" />
          Pilih Acara Presensi:
        </label>
        <select
          value={selectedAcara}
          onChange={(e) => setSelectedAcara(e.target.value)}
          className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium text-sm sm:text-base outline-none"
        >
          <option value="">-- Pilih Acara Aktif --</option>
          {acaraList.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nama_acara} - {a.tanggal} ({a.lokasi})
            </option>
          ))}
        </select>
      </div>

      {/* Layout Grid 2 Kolom */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Kolom A: Kamera QR */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 flex flex-col items-center">
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800 mb-4">
            <Camera className="w-5 h-5 text-blue-600" />
            Kolom A: Pemindai Kamera QR Code
          </h2>
          {!selectedAcara ? (
            <div className="h-64 flex items-center justify-center text-gray-400 text-center text-sm">
              Pilih acara di atas untuk mengaktifkan scanner kamera.
            </div>
          ) : (
            <div id="reader" className="w-full"></div>
          )}
        </div>

        {/* Kolom B: Presensi Manual */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Kolom B: Presensi Manual</h2>

          {/* Toggle Tab */}
          <div className="flex border-b mb-6 text-sm">
            <button
              onClick={() => setActiveTab('ada')}
              className={`flex-1 py-2 font-medium flex items-center justify-center gap-2 border-b-2 ${
                activeTab === 'ada' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
              }`}
            >
              <UserCheck className="w-4 h-4" /> Pilih Data Ada
            </button>
            <button
              onClick={() => setActiveTab('baru')}
              className={`flex-1 py-2 font-medium flex items-center justify-center gap-2 border-b-2 ${
                activeTab === 'baru' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
              }`}
            >
              <UserPlus className="w-4 h-4" /> + Generus Baru
            </button>
          </div>

          {/* Tab 1: Data Ada */}
          {activeTab === 'ada' && (
            <form onSubmit={handleManualAdaSubmit} className="space-y-4">
              
              {/* Filter Pilih Kelompok */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium mb-1 text-slate-700">
                  <Filter className="w-3.5 h-3.5 text-blue-600" /> Filter Kelompok
                </label>
                <select
                  value={selectedKelompokFilter}
                  onChange={(e) => {
                    setSelectedKelompokFilter(e.target.value)
                    setSelectedGenerusId('') // Reset pilihan nama jika kelompok berganti
                  }}
                  className="w-full p-2.5 border rounded-lg text-xs sm:text-sm bg-gray-50 focus:bg-white outline-none"
                  disabled={!selectedAcara}
                >
                  <option value="">-- Semua Kelompok --</option>
                  {kelompokOptions.map((kel) => (
                    <option key={kel} value={kel}>
                      {kel}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dropdown Pilih Nama (Tersaring berdasarkan kelompok) */}
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Cari Nama Generus</label>
                <select
                  value={selectedGenerusId}
                  onChange={(e) => setSelectedGenerusId(e.target.value)}
                  className="w-full p-2.5 border rounded-lg text-xs sm:text-sm bg-white outline-none"
                  disabled={!selectedAcara}
                >
                  <option value="">-- Pilih Generus --</option>
                  {filteredGenerusList.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nama} ({g.kelompok} - {g.jenis_kelamin}, {g.kelas})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={!selectedAcara || !selectedGenerusId}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 text-xs sm:text-sm transition"
              >
                Submit Presensi
              </button>
            </form>
          )}

          {/* Tab 2: Data Baru */}
          {activeTab === 'baru' && (
            <form onSubmit={handleManualBaruSubmit} className="space-y-3 text-xs sm:text-sm">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  placeholder="Masukkan Nama Lengkap"
                  value={namaBaru}
                  onChange={(e) => setNamaBaru(e.target.value)}
                  required
                  className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Kelompok</label>
                  <select
                    value={kelompokBaru}
                    onChange={(e) => setKelompokBaru(e.target.value)}
                    className="w-full p-2.5 border rounded-lg outline-none bg-white"
                  >
                    <option value="Gonjen 1">Gonjen 1</option>
                    <option value="Gonjen 2">Gonjen 2</option>
                    <option value="Kembaran">Kembaran</option>
                    <option value="Sembung">Sembung</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Jenis Kelamin</label>
                  <select
                    value={jkBaru}
                    onChange={(e) => setJkBaru(e.target.value as any)}
                    className="w-full p-2.5 border rounded-lg outline-none bg-white"
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Kelas / Usia</label>
                <select
                  value={kelasBaru}
                  onChange={(e) => setKelasBaru(e.target.value)}
                  className="w-full p-2.5 border rounded-lg outline-none bg-white"
                >
                  <option value="Pra Remaja">Pra Remaja</option>
                  <option value="Remaja">Remaja</option>
                  <option value="Pra Nikah">Pra Nikah</option>
                  <option value="Mandiri">Mandiri</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={!selectedAcara}
                className="w-full py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 transition mt-2"
              >
                Simpan & Catat Presensi
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}