'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { Camera, UserCheck, UserPlus, Calendar } from 'lucide-react'

export default function AdminScanPage() {
  const supabase = createClient()
  const [acaraList, setAcaraList] = useState<any[]>([])
  const [selectedAcara, setSelectedAcara] = useState<string>('')
  const [generusList, setGenerusList] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'ada' | 'baru'>('ada')
  const [selectedGenerusId, setSelectedGenerusId] = useState<string>('')
  
  // State Form Generus Baru
  const [namaBaru, setNamaBaru] = useState('')
  const [kelompokBaru, setKelompokBaru] = useState('Gonjen 1')
  const [jkBaru, setJkBaru] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki')
  const [kelasBaru, setKelasBaru] = useState('Pra Remaja')

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    fetchAcara()
    fetchGenerus()
  }, [])

  useEffect(() => {
    if (!selectedAcara) return

    const scanner = new Html5QrcodeScanner(
      'reader',
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    )

    scanner.render(
      async (decodedText) => {
        await handleProcessPresensiByQR(decodedText)
      },
      (error) => {}
    )

    return () => {
      scanner.clear().catch(() => {})
    }
  }, [selectedAcara])

  const fetchAcara = async () => {
    const { data } = await supabase.from('acara').select('*').order('tanggal', { ascending: false })
    if (data) setAcaraList(data)
  }

  const fetchGenerus = async () => {
    const { data } = await supabase.from('generus').select('*')
      .order('kelompok', { ascending: true })
      .order('nama', { ascending: true })
      .order('jenis_kelamin', { ascending: true })
      .order('kelas', { ascending: true })
    if (data) setGenerusList(data)
  }

  const handleProcessPresensiByQR = async (qrCodeId: string) => {
    if (!selectedAcara) {
      setMessage({ text: 'Pilih acara terlebih dahulu!', type: 'error' })
      return
    }

    const { data: gen } = await supabase.from('generus').select('id, nama').eq('qr_code_id', qrCodeId).single()
    if (!gen) {
      setMessage({ text: `Kode QR (${qrCodeId}) tidak ditemukan!`, type: 'error' })
      return
    }

    await submitPresensi(gen.id, gen.nama, 'QR Scan')
  }

  const submitPresensi = async (generusId: string, nama: string, metode: 'QR Scan' | 'Manual Admin') => {
    const { error } = await supabase.from('presensi').insert({
      generus_id: generusId,
      acara_id: selectedAcara,
      status: 'Hadir',
      metode: metode
    })

    if (error) {
      if (error.code === '23505') {
        setMessage({ text: `${nama} sudah tercatat hadir sebelumnya!`, type: 'error' })
      } else {
        setMessage({ text: `Gagal mencatat presensi: ${error.message}`, type: 'error' })
      }
    } else {
      setMessage({ text: `Berhasil! ${nama} tercatat Hadir (${metode}).`, type: 'success' })
    }
  }

  const handleManualAdaSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAcara || !selectedGenerusId) return
    const gen = generusList.find(g => g.id === selectedGenerusId)
    if (gen) await submitPresensi(gen.id, gen.nama, 'Manual Admin')
  }

  const handleManualBaruSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAcara) return

    const { data: newGen, error } = await supabase.from('generus').insert({
      nama: namaBaru,
      kelompok: kelompokBaru,
      jenis_kelamin: jkBaru,
      kelas: kelasBaru,
      qr_code_id: `GEN-${Math.floor(1000 + Math.random() * 9000)}`
    }).select().single()

    if (error || !newGen) {
      setMessage({ text: 'Gagal menambah generus baru.', type: 'error' })
      return
    }

    await fetchGenerus()
    await submitPresensi(newGen.id, newGen.nama, 'Manual Admin')
    
    // Reset Form
    setNamaBaru('')
    setKelompokBaru('Gonjen 1')
    setJkBaru('Laki-laki')
    setKelasBaru('Pra Remaja')
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* 1. BAGIAN ATAS: Full-Width Card Pilih Acara */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
        <label className="flex items-center gap-2 text-lg font-bold text-gray-800 mb-3">
          <Calendar className="w-5 h-5 text-blue-600" />
          1. Pilih Acara Terlebih Dahulu:
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

      {message && (
        <div className={`p-4 rounded-lg text-white font-medium text-sm ${message.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {message.text}
        </div>
      )}

      {/* 2. BAGIAN BAWAH: 2 Kolom Layout Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Kolom A: Pemindai Kamera QR Code */}
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
          
          {/* Tab Switcher Toggle */}
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

          {/* Tab 1: Pilih Data Ada */}
          {activeTab === 'ada' && (
            <form onSubmit={handleManualAdaSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Cari Nama Generus</label>
                <select
                  value={selectedGenerusId}
                  onChange={(e) => setSelectedGenerusId(e.target.value)}
                  className="w-full p-2.5 border rounded-lg text-xs sm:text-sm bg-white outline-none"
                  disabled={!selectedAcara}
                >
                  <option value="">-- Pilih Generus --</option>
                  {generusList.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.kelompok} - {g.nama} ({g.jenis_kelamin}, {g.kelas})
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

          {/* Tab 2: + Generus Baru */}
          {activeTab === 'baru' && (
            <form onSubmit={handleManualBaruSubmit} className="space-y-3 text-xs sm:text-sm">
              <div>
                <input
                  type="text"
                  placeholder="Nama Lengkap"
                  value={namaBaru}
                  onChange={(e) => setNamaBaru(e.target.value)}
                  required
                  className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Dropdown Kelompok */}
              <div>
                <select
                  value={kelompokBaru}
                  onChange={(e) => setKelompokBaru(e.target.value)}
                  className="w-full p-2.5 border rounded-lg outline-none bg-white text-slate-700"
                >
                  <option value="Gonjen 1">Gonjen 1</option>
                  <option value="Gonjen 2">Gonjen 2</option>
                  <option value="Kembaran">Kembaran</option>
                  <option value="Sembung">Sembung</option>
                </select>
              </div>

              {/* Dropdown Jenis Kelamin */}
              <div>
                <select
                  value={jkBaru}
                  onChange={(e) => setJkBaru(e.target.value as any)}
                  className="w-full p-2.5 border rounded-lg outline-none bg-white text-slate-700"
                >
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>

              {/* Dropdown Kelas / Tingkat */}
              <div>
                <select
                  value={kelasBaru}
                  onChange={(e) => setKelasBaru(e.target.value)}
                  className="w-full p-2.5 border rounded-lg outline-none bg-white text-slate-700"
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