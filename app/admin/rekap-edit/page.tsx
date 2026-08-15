'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Calendar, Search, Save, CheckCircle2 } from 'lucide-react'

export default function RekapEditPage() {
  const supabase = createClient()
  const [acaraList, setAcaraList] = useState<any[]>([])
  const [selectedAcara, setSelectedAcara] = useState<string>('')
  const [generusList, setGenerusList] = useState<any[]>([])
  const [presensiMap, setPresensiMap] = useState<{ [key: string]: { status: string; alasan: string } }>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    fetchAcara()
  }, [])

  useEffect(() => {
    if (selectedAcara) {
      fetchRekapData()
    }
  }, [selectedAcara])

  const fetchAcara = async () => {
    const { data } = await supabase.from('acara').select('*').order('tanggal', { ascending: false })
    if (data) setAcaraList(data)
  }

  const fetchRekapData = async () => {
    setLoading(true)
    // 1. Fetch semua generus
    const { data: generusData } = await supabase
      .from('generus')
      .select('*')
      .order('kelompok', { ascending: true })
      .order('nama', { ascending: true })

    // 2. Fetch presensi untuk acara terpilih
    const { data: presensiData } = await supabase
      .from('presensi')
      .select('*')
      .eq('acara_id', selectedAcara)

    if (generusData) {
      setGenerusList(generusData)

      // Buat mapping status presensi per generus_id
      const pMap: { [key: string]: { status: string; alasan: string } } = {}
      
      // Default: Alpa / Belum Presensi
      generusData.forEach((g) => {
        pMap[g.id] = { status: 'Alpa / Belum Presensi', alasan: '' }
      })

      // Timpa dengan data presensi dari database jika ada
      if (presensiData) {
        presensiData.forEach((p) => {
          // Normalisasi status ke format Title Case yang valid
          let currentStatus = p.status
          if (currentStatus === 'sakit' || currentStatus === 'Sakit' || currentStatus === 'izin' || currentStatus === 'Izin') {
            currentStatus = 'Izin'
          } else if (currentStatus === 'hadir' || currentStatus === 'Hadir') {
            currentStatus = 'Hadir'
          } else {
            currentStatus = 'Alpa / Belum Presensi'
          }

          pMap[p.generus_id] = {
            status: currentStatus,
            alasan: p.alasan || ''
          }
        })
      }

      setPresensiMap(pMap)
    }
    setLoading(false)
  }

  const handleStatusChange = (generusId: string, newStatus: string) => {
    setPresensiMap((prev) => ({
      ...prev,
      [generusId]: {
        ...prev[generusId],
        status: newStatus,
        // Jika status bukan Izin, kosongkan alasan
        alasan: newStatus === 'Izin' ? prev[generusId]?.alasan || '' : ''
      }
    }))
  }

  const handleAlasanChange = (generusId: string, newAlasan: string) => {
    setPresensiMap((prev) => ({
      ...prev,
      [generusId]: {
        ...prev[generusId],
        alasan: newAlasan
      }
    }))
  }

  const handleSave = async (generusId: string) => {
    if (!selectedAcara) return alert('Pilih acara terlebih dahulu!')

    setSavingId(generusId)
    const item = presensiMap[generusId]
    const validStatus = item.status // Berisi 'Hadir', 'Izin', atau 'Alpa / Belum Presensi'

    // Jika status "Alpa / Belum Presensi", hapus record jika ada
    if (validStatus === 'Alpa / Belum Presensi') {
      const { error } = await supabase
        .from('presensi')
        .delete()
        .eq('generus_id', generusId)
        .eq('acara_id', selectedAcara)

      if (error) {
        alert('Gagal memperbarui status: ' + error.message)
      } else {
        alert('Berhasil memperbarui status presensi!')
      }
    } else {
      // Simpan atau Update (Upsert)
      const { error } = await supabase
        .from('presensi')
        .upsert(
          {
            generus_id: generusId,
            acara_id: selectedAcara,
            status: validStatus,
            alasan: validStatus === 'Izin' ? item.alasan : null,
            metode: 'Manual Admin'
          },
          { onConflict: 'generus_id, acara_id' }
        )

      if (error) {
        alert('Gagal menyimpan presensi: ' + error.message)
      } else {
        alert('Berhasil menyimpan data presensi!')
      }
    }

    setSavingId(null)
  }

  // Filter data berdasarkan kata kunci pencarian
  const filteredGenerus = generusList.filter((g) => {
    const q = searchQuery.toLowerCase()
    return (
      g.nama.toLowerCase().includes(q) ||
      g.kelompok.toLowerCase().includes(q) ||
      g.kelas.toLowerCase().includes(q)
    )
  })

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header Info */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 space-y-2">
        <h1 className="text-xl font-bold text-gray-800">Rekap Presensi & Control Status</h1>
        <p className="text-sm text-gray-500">
          Menampilkan seluruh anggota Generus. Admin dapat mengubah status kehadiran (Hadir / Izin) dan menambahkan alasan untuk Izin/Sakit.
        </p>

        {/* Form Filter Acara & Pencarian */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          <div>
            <select
              value={selectedAcara}
              onChange={(e) => setSelectedAcara(e.target.value)}
              className="w-full p-2.5 border rounded-lg bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Pilih Acara --</option>
              {acaraList.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nama_acara} - {a.tanggal}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama, kelas, atau kelompok..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Tabel Data Rekap */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        {!selectedAcara ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            Silakan pilih acara terlebih dahulu untuk menampilkan daftar rekap presensi.
          </div>
        ) : loading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Memuat data rekap...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500 font-semibold">
                <tr>
                  <th className="p-4">Nama Generus</th>
                  <th className="p-4">Kelompok / Kelas</th>
                  <th className="p-4">Status Kehadiran</th>
                  <th className="p-4">Alasan (Izin / Sakit)</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredGenerus.map((g) => {
                  const currentPresensi = presensiMap[g.id] || { status: 'Alpa / Belum Presensi', alasan: '' }

                  return (
                    <tr key={g.id} className="hover:bg-gray-50/50 transition">
                      <td className="p-4">
                        <div className="font-semibold text-gray-800">{g.nama}</div>
                        <div className="text-xs text-gray-400">ID: {g.qr_code_id}</div>
                      </td>
                      <td className="p-4 text-gray-600">
                        <div>{g.kelompok}</div>
                        <div className="text-xs text-gray-400">{g.kelas}</div>
                      </td>
                      <td className="p-4">
                        <select
                          value={currentPresensi.status}
                          onChange={(e) => handleStatusChange(g.id, e.target.value)}
                          className={`p-2 border rounded-lg text-xs font-semibold outline-none ${
                            currentPresensi.status === 'Hadir'
                              ? 'border-green-300 bg-green-50 text-green-700'
                              : currentPresensi.status === 'Izin'
                              ? 'border-amber-300 bg-amber-50 text-amber-700'
                              : 'border-gray-200 bg-gray-50 text-gray-600'
                          }`}
                        >
                          <option value="Hadir">Hadir</option>
                          <option value="Izin">Izin</option>
                          <option value="Alpa / Belum Presensi">Alpa / Belum Presensi</option>
                        </select>
                      </td>
                      <td className="p-4">
                        {currentPresensi.status === 'Izin' ? (
                          <input
                            type="text"
                            placeholder="Contoh: Sakit flu / Acara keluarga"
                            value={currentPresensi.alasan}
                            onChange={(e) => handleAlasanChange(g.id, e.target.value)}
                            className="w-full p-2 border rounded-lg text-xs outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        ) : (
                          <span className="text-gray-300 text-xs">-</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleSave(g.id)}
                          disabled={savingId === g.id}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:bg-gray-300 transition flex items-center gap-1.5 mx-auto"
                        >
                          <Save className="w-3.5 h-3.5" />
                          {savingId === g.id ? 'Simpan...' : 'Simpan'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}