'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, Search, Filter, CheckCircle2, Clock, AlertCircle, HelpCircle } from 'lucide-react'

export default function RekapAdminEditPage() {
  const [generusList, setGenerusList] = useState<any[]>([])
  const [acaraList, setAcaraList] = useState<any[]>([])
  const [selectedAcara, setSelectedAcara] = useState<string>('')
  const [presensiMap, setPresensiMap] = useState<Record<string, any>>({})
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  // Form State untuk perubahan status per row
  const [editStates, setEditStates] = useState<Record<string, { status: string; alasan: string }>>({})

  const supabase = createClient()

  useEffect(() => {
    fetchAcaraAndGenerus()
  }, [])

  useEffect(() => {
    if (selectedAcara) {
      fetchPresensiForAcara(selectedAcara)
    } else {
      setPresensiMap({})
    }
  }, [selectedAcara])

  const fetchAcaraAndGenerus = async () => {
    setLoading(true)
    // Fetch Acara
    const { data: dataAcara } = await supabase.from('acara').select('*').order('created_at', { ascending: false })
    if (dataAcara && dataAcara.length > 0) {
      setAcaraList(dataAcara)
      setSelectedAcara(dataAcara[0].id) // Default ke acara terbaru
    }

    // Fetch Semua Data Generus
    const { data: dataGenerus } = await supabase.from('generus').select('*').order('nama', { ascending: true })
    if (dataGenerus) {
      setGenerusList(dataGenerus)
    }
    setLoading(false)
  }

  const fetchPresensiForAcara = async (acaraId: string) => {
    setLoading(true)
    const { data } = await supabase
      .from('presensi')
      .select('*')
      .eq('acara_id', acaraId)

    const map: Record<string, any> = {}
    const initialEdits: Record<string, { status: string; alasan: string }> = {}

    if (data) {
      data.forEach((p) => {
        map[p.generus_id] = p
        initialEdits[p.generus_id] = {
          status: p.status || 'hadir',
          alasan: p.alasan || '',
        }
      })
    }

    setPresensiMap(map)
    setEditStates(initialEdits)
    setLoading(false)
  }

  const handleStateChange = (generusId: string, field: 'status' | 'alasan', value: string) => {
    setEditStates((prev) => ({
      ...prev,
      [generusId]: {
        status: field === 'status' ? value : (prev[generusId]?.status || 'hadir'),
        alasan: field === 'alasan' ? value : (prev[generusId]?.alasan || ''),
      },
    }))
  }

  const handleSavePresensi = async (generusId: string) => {
    if (!selectedAcara) {
      alert('Pilih acara terlebih dahulu!')
      return
    }

    setSavingId(generusId)
    const currentState = editStates[generusId] || { status: 'hadir', alasan: '' }
    const existingPresensi = presensiMap[generusId]

    if (existingPresensi) {
      // Update data presensi yang sudah ada
      const { error } = await supabase
        .from('presensi')
        .update({
          status: currentState.status,
          alasan: currentState.status === 'izin' || currentState.status === 'sakit' ? currentState.alasan : '',
        })
        .eq('id', existingPresensi.id)

      if (error) {
        alert('Gagal memperbarui presensi: ' + error.message)
      } else {
        fetchPresensiForAcara(selectedAcara)
      }
    } else {
      // Insert data presensi baru
      const { error } = await supabase.from('presensi').insert({
        generus_id: generusId,
        acara_id: selectedAcara,
        status: currentState.status,
        alasan: currentState.status === 'izin' || currentState.status === 'sakit' ? currentState.alasan : '',
        metode: 'manual_admin',
      })

      if (error) {
        alert('Gagal menyimpan presensi: ' + error.message)
      } else {
        fetchPresensiForAcara(selectedAcara)
      }
    }
    setSavingId(null)
  }

  const filteredGenerus = generusList.filter(
    (g) =>
      g.nama?.toLowerCase().includes(search.toLowerCase()) ||
      g.kelompok?.toLowerCase().includes(search.toLowerCase()) ||
      g.kelas?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header & Filter Card */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-1">Rekap Presensi & Control Status</h2>
        <p className="text-sm text-slate-500 mb-4">
          Menampilkan seluruh anggota Generus. Admin dapat mengubah status kehadiran dan menambahkan alasan untuk Izin/Sakit.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Filter className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
            <select
              value={selectedAcara}
              onChange={(e) => setSelectedAcara(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium text-slate-700"
            >
              <option value="">-- Pilih Acara --</option>
              {acaraList.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nama_acara} ({a.tanggal ? new Date(a.tanggal).toLocaleDateString('id-ID') : '-'})
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, kelas, atau kelompok..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Tabel Utama Generus */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider border-b">
                <th className="p-3.5">Nama Generus</th>
                <th className="p-3.5">Kelompok / Kelas</th>
                <th className="p-3.5">Status Kehadiran</th>
                <th className="p-3.5">Alasan (Izin / Sakit)</th>
                <th className="p-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center p-8 text-slate-500">
                    Memuat data generus & presensi...
                  </td>
                </tr>
              ) : filteredGenerus.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center p-8 text-slate-500">
                    Tidak ada data generus ditemukan.
                  </td>
                </tr>
              ) : (
                filteredGenerus.map((g) => {
                  const presensiData = presensiMap[g.id]
                  const currentEdit = editStates[g.id] || {
                    status: presensiData?.status || 'alpa',
                    alasan: presensiData?.alasan || '',
                  }

                  const isSaved = !!presensiData

                  return (
                    <tr key={g.id} className="hover:bg-slate-50/80 transition">
                      {/* Nama Generus */}
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-800">{g.nama}</div>
                        <div className="text-xs text-slate-400">ID: {g.qr_code_id || '-'}</div>
                      </td>

                      {/* Kelompok & Kelas */}
                      <td className="p-3.5 text-slate-600">
                        <div>{g.kelompok || '-'}</div>
                        <div className="text-xs text-slate-400">{g.kelas || '-'}</div>
                      </td>

                      {/* Pilihan Status Kehadiran */}
                      <td className="p-3.5">
                        <select
                          value={currentEdit.status}
                          onChange={(e) => handleStateChange(g.id, 'status', e.target.value)}
                          className={`px-3 py-1.5 border rounded-lg text-xs font-semibold outline-none transition ${
                            currentEdit.status === 'hadir'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : currentEdit.status === 'izin'
                              ? 'bg-amber-50 text-amber-700 border-amber-300'
                              : currentEdit.status === 'sakit'
                              ? 'bg-blue-50 text-blue-700 border-blue-300'
                              : 'bg-red-50 text-red-700 border-red-300'
                          }`}
                        >
                          <option value="hadir">Hadir</option>
                          <option value="izin">Izin</option>
                          <option value="sakit">Sakit</option>
                          <option value="alpa">Alpa / Belum Presensi</option>
                        </select>
                      </td>

                      {/* Input Alasan (Aktif jika Izin atau Sakit) */}
                      <td className="p-3.5">
                        {currentEdit.status === 'izin' || currentEdit.status === 'sakit' ? (
                          <input
                            type="text"
                            placeholder={`Alasan ${currentEdit.status}...`}
                            value={currentEdit.alasan}
                            onChange={(e) => handleStateChange(g.id, 'alasan', e.target.value)}
                            className="w-full px-3 py-1.5 text-xs border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          />
                        ) : (
                          <span className="text-xs text-slate-400 italic">-</span>
                        )}
                      </td>

                      {/* Tombol Simpan Aksi */}
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => handleSavePresensi(g.id)}
                          disabled={savingId === g.id}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                            savingId === g.id
                              ? 'bg-slate-300 text-slate-600'
                              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                          }`}
                        >
                          <Save className="w-3.5 h-3.5" />
                          {savingId === g.id ? 'Menyimpan...' : isSaved ? 'Update' : 'Simpan'}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}