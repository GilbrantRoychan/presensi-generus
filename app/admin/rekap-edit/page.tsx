'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Save, Download, Printer } from 'lucide-react'
import * as XLSX from 'xlsx'

export default function RekapEditPage() {
  const supabase = createClient()
  const [acaraList, setAcaraList] = useState<any[]>([])
  const [selectedAcara, setSelectedAcara] = useState<string>('')
  const [generusList, setGenerusList] = useState<any[]>([])
  const [presensiMap, setPresensiMap] = useState<{ [key: string]: { status: string; alasan: string } }>({})
  
  // Filter Dropdown State
  const [selectedKelompok, setSelectedKelompok] = useState<string>('Semua')
  const [selectedJK, setSelectedJK] = useState<string>('Semua')
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
    const { data: generusData } = await supabase
      .from('generus')
      .select('*')
      .order('kelompok', { ascending: true })
      .order('nama', { ascending: true })

    const { data: presensiData } = await supabase
      .from('presensi')
      .select('*')
      .eq('acara_id', selectedAcara)

    if (generusData) {
      setGenerusList(generusData)

      const pMap: { [key: string]: { status: string; alasan: string } } = {}
      generusData.forEach((g) => {
        pMap[g.id] = { status: 'Alpa / Belum Presensi', alasan: '' }
      })

      if (presensiData) {
        presensiData.forEach((p) => {
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
    const validStatus = item.status

    if (validStatus === 'Alpa / Belum Presensi') {
      const { error } = await supabase
        .from('presensi')
        .delete()
        .eq('generus_id', generusId)
        .eq('acara_id', selectedAcara)

      if (error) alert('Gagal memperbarui status: ' + error.message)
      else alert('Berhasil memperbarui status presensi!')
    } else {
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

      if (error) alert('Gagal menyimpan presensi: ' + error.message)
      else alert('Berhasil menyimpan data presensi!')
    }
    setSavingId(null)
  }

  const filteredGenerus = generusList.filter((g) => {
    const matchKelompok = selectedKelompok === 'Semua' || g.kelompok === selectedKelompok
    const matchJK = selectedJK === 'Semua' || g.jenis_kelamin === selectedJK
    const matchSearch =
      g.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.kelas.toLowerCase().includes(searchQuery.toLowerCase())
    return matchKelompok && matchJK && matchSearch
  })

  // Hitung Statistik Presensi Berdasarkan Data Terfilter
  const totalGenerus = filteredGenerus.length
  let totalHadir = 0
  let totalIzin = 0
  let totalAlpa = 0

  filteredGenerus.forEach((g) => {
    const st = presensiMap[g.id]?.status
    if (st === 'Hadir') totalHadir++
    else if (st === 'Izin') totalIzin++
    else totalAlpa++
  })

  const persentaseHadir = totalGenerus > 0 ? ((totalHadir / totalGenerus) * 100).toFixed(1) : '0'
  const currentAcaraInfo = acaraList.find((a) => a.id === selectedAcara)

  // Fitur Export ke Excel
  const handleExportExcel = () => {
    if (!selectedAcara) return alert('Pilih acara terlebih dahulu!')

    const namaAcaraStr = currentAcaraInfo ? `${currentAcaraInfo.nama_acara} (${currentAcaraInfo.tanggal})` : 'Acara'

    const exportData = filteredGenerus.map((g, index) => {
      const pData = presensiMap[g.id] || { status: 'Alpa / Belum Presensi', alasan: '' }
      return {
        'No': index + 1,
        'Nama Lengkap': g.nama,
        'Jenis Kelamin': g.jenis_kelamin,
        'Kelompok': g.kelompok,
        'Kelas / Tingkat': g.kelas,
        'Status Presensi': pData.status,
        'Alasan / Keterangan': pData.alasan || '-'
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Presensi')

    const max_width = exportData.reduce((w, r) => Math.max(w, r['Nama Lengkap'].length), 10)
    worksheet['!cols'] = [
      { wch: 5 },
      { wch: max_width + 5 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 22 },
      { wch: 25 }
    ]

    XLSX.writeFile(workbook, `Rekap_Presensi_${namaAcaraStr.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`)
  }

  const handlePrint = () => {
    if (!selectedAcara) return alert('Pilih acara terlebih dahulu!')
    window.print()
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6 print:p-0 print:max-w-none">
      
      {/* Header Khusus Print (Tampak Hanya Saat Cetak PDF) */}
      {selectedAcara && currentAcaraInfo && (
        <div className="hidden print:block mb-6 pb-4 border-b border-gray-300">
          <h1 className="text-2xl font-bold text-center text-slate-900 mb-4 uppercase tracking-wide">
            Laporan Rekapitulasi Presensi
          </h1>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-700 font-medium">
            <p><span className="font-bold">Nama Acara:</span> {currentAcaraInfo.nama_acara}</p>
            <p><span className="font-bold">Tanggal:</span> {currentAcaraInfo.tanggal}</p>
            <p><span className="font-bold">Lokasi:</span> {currentAcaraInfo.lokasi || '-'}</p>
            <p><span className="font-bold">Koordinator:</span> {currentAcaraInfo.koor || '-'}</p>
          </div>
        </div>
      )}

      {/* Header Utama Web */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4 print:shadow-none print:border-none print:p-0 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Rekap Presensi & Control Status</h1>
            <p className="text-sm text-gray-500">
              Kelola status presensi generus dan unduh rekap data.
            </p>
          </div>

          {selectedAcara && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportExcel}
                className="px-3.5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition flex items-center gap-1.5 shadow-sm"
              >
                <Download className="w-4 h-4" /> Export Excel
              </button>
              <button
                onClick={handlePrint}
                className="px-3.5 py-2 bg-gray-800 text-white rounded-lg text-xs font-semibold hover:bg-gray-900 transition flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-4 h-4" /> Cetak / PDF
              </button>
            </div>
          )}
        </div>

        {/* Dropdown Acara & Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Pilih Acara</label>
            <select
              value={selectedAcara}
              onChange={(e) => setSelectedAcara(e.target.value)}
              className="w-full p-2.5 border rounded-lg bg-gray-50 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Pilih Acara --</option>
              {acaraList.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nama_acara} - {a.tanggal}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Filter Kelompok</label>
            <select
              value={selectedKelompok}
              onChange={(e) => setSelectedKelompok(e.target.value)}
              className="w-full p-2.5 border rounded-lg bg-gray-50 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Semua">Semua Kelompok</option>
              <option value="Gonjen 1">Gonjen 1</option>
              <option value="Gonjen 2">Gonjen 2</option>
              <option value="Kembaran">Kembaran</option>
              <option value="Sembung">Sembung</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Filter Jenis Kelamin</label>
            <select
              value={selectedJK}
              onChange={(e) => setSelectedJK(e.target.value)}
              className="w-full p-2.5 border rounded-lg bg-gray-50 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Semua">Semua Jenis Kelamin</option>
              <option value="Laki-laki">Laki-laki</option>
              <option value="Perempuan">Perempuan</option>
            </select>
          </div>
        </div>
      </div>

      {/* Kartu Statistik Rekap Kehadiran */}
      {selectedAcara && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 print:grid-cols-5 print:gap-2 mb-4">
          <div className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-100 print:border-gray-300 print:p-2">
            <p className="text-xs text-gray-500 font-medium">Total Generus</p>
            <p className="text-xl font-bold text-gray-800 print:text-base">{totalGenerus}</p>
          </div>
          <div className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-100 print:border-gray-300 print:p-2">
            <p className="text-xs text-gray-500 font-medium">Hadir</p>
            <p className="text-xl font-bold text-green-600 print:text-base">{totalHadir}</p>
          </div>
          <div className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-100 print:border-gray-300 print:p-2">
            <p className="text-xs text-gray-500 font-medium">Izin</p>
            <p className="text-xl font-bold text-amber-600 print:text-base">{totalIzin}</p>
          </div>
          <div className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-100 print:border-gray-300 print:p-2">
            <p className="text-xs text-gray-500 font-medium">Alpa</p>
            <p className="text-xl font-bold text-gray-400 print:text-base">{totalAlpa}</p>
          </div>
          <div className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-100 col-span-2 sm:col-span-1 print:col-span-1 print:border-gray-300 print:p-2">
            <p className="text-xs text-gray-500 font-medium">Persentase</p>
            <p className="text-xl font-bold text-blue-600 print:text-base">{persentaseHadir}%</p>
          </div>
        </div>
      )}

      {/* Search Input (Di-hide saat Cetak) */}
      <div className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-100 relative print:hidden">
        <Search className="w-4 h-4 absolute left-6 top-6 text-gray-400" />
        <input
          type="text"
          placeholder="Cari nama, kelas, atau kelompok..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 border rounded-lg text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Tabel Data Rekap */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print:shadow-none print:border-gray-300">
        {!selectedAcara ? (
          <div className="p-8 text-center text-gray-400 text-sm print:hidden">
            Silakan pilih acara terlebih dahulu untuk menampilkan daftar rekap presensi.
          </div>
        ) : loading ? (
          <div className="p-8 text-center text-gray-500 text-sm print:hidden">Memuat data rekap...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm print:text-xs border-collapse">
              <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500 font-semibold print:bg-gray-100">
                <tr>
                  <th className="p-4 print:p-2 print:border print:border-gray-300">Nama Generus</th>
                  <th className="p-4 print:p-2 print:border print:border-gray-300">Kelompok / Kelas</th>
                  <th className="p-4 print:p-2 print:border print:border-gray-300">Status Kehadiran</th>
                  <th className="p-4 print:p-2 print:border print:border-gray-300">Alasan (Izin / Sakit)</th>
                  <th className="p-4 text-center print:hidden">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 print:divide-y-0">
                {filteredGenerus.map((g) => {
                  const currentPresensi = presensiMap[g.id] || { status: 'Alpa / Belum Presensi', alasan: '' }

                  return (
                    <tr key={g.id} className="hover:bg-gray-50/50 transition print:hover:bg-transparent">
                      <td className="p-4 print:p-2 print:border print:border-gray-300">
                        <div className="font-semibold text-gray-800">{g.nama}</div>
                        <div className="text-xs text-gray-400 print:text-gray-600">{g.jenis_kelamin}</div>
                      </td>
                      <td className="p-4 text-gray-600 print:p-2 print:border print:border-gray-300">
                        <div>{g.kelompok}</div>
                        <div className="text-xs text-gray-400 print:text-gray-600">{g.kelas}</div>
                      </td>
                      <td className="p-4 print:p-2 print:border print:border-gray-300">
                        {/* Tampilan Web Interaktif */}
                        <div className="print:hidden">
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
                        </div>

                        {/* Tampilan Cetak Read-only */}
                        <div className="hidden print:block font-semibold">
                          {currentPresensi.status}
                        </div>
                      </td>
                      <td className="p-4 print:p-2 print:border print:border-gray-300">
                        {/* Tampilan Web Interaktif */}
                        <div className="print:hidden">
                          {currentPresensi.status === 'Izin' ? (
                            <input
                              type="text"
                              placeholder="Alasan izin..."
                              value={currentPresensi.alasan}
                              onChange={(e) => handleAlasanChange(g.id, e.target.value)}
                              className="w-full p-2 border rounded-lg text-xs outline-none focus:ring-1 focus:ring-amber-500"
                            />
                          ) : (
                            <span className="text-gray-300 text-xs">-</span>
                          )}
                        </div>

                        {/* Tampilan Cetak Read-only */}
                        <div className="hidden print:block">
                          {currentPresensi.status === 'Izin' ? currentPresensi.alasan || '-' : '-'}
                        </div>
                      </td>
                      <td className="p-4 text-center print:hidden">
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