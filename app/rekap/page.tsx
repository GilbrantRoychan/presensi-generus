'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Download, Printer } from 'lucide-react'
import * as XLSX from 'xlsx'

export default function RekapPage() {
  const supabase = createClient()
  const [acaraList, setAcaraList] = useState<any[]>([])
  const [selectedAcara, setSelectedAcara] = useState<string>('')
  const [selectedAcaraObj, setSelectedAcaraObj] = useState<any>(null)
  const [generusList, setGenerusList] = useState<any[]>([])
  const [presensiMap, setPresensiMap] = useState<{ [key: string]: { status: string; alasan: string; metode: string } }>({})
  
  // Filter State
  const [selectedKelompok, setSelectedKelompok] = useState<string>('Semua')
  const [selectedJK, setSelectedJK] = useState<string>('Semua')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchAcara()
  }, [])

  useEffect(() => {
    if (selectedAcara) {
      const acara = acaraList.find((a) => a.id === selectedAcara)
      setSelectedAcaraObj(acara || null)
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
      const pMap: { [key: string]: { status: string; alasan: string; metode: string } } = {}
      
      generusData.forEach((g) => {
        pMap[g.id] = { status: 'Alpa / Belum Presensi', alasan: '-', metode: '-' }
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
            alasan: p.alasan || '-',
            metode: p.metode || 'Manual'
          }
        })
      }
      setPresensiMap(pMap)
    }
    setLoading(false)
  }

  // Filter Data
  const filteredGenerus = generusList.filter((g) => {
    const matchKelompok = selectedKelompok === 'Semua' || g.kelompok === selectedKelompok
    const matchJK = selectedJK === 'Semua' || g.jenis_kelamin === selectedJK
    const matchSearch =
      g.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.kelas.toLowerCase().includes(searchQuery.toLowerCase())
    return matchKelompok && matchJK && matchSearch
  })

  // Hitung Statistik
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

  // Fitur 1: Export Ke Excel (.xlsx)
  const handleExportExcel = () => {
    if (!selectedAcaraObj) return alert('Pilih acara terlebih dahulu!')

    const dataToExport = filteredGenerus.map((g, index) => {
      const pData = presensiMap[g.id] || { status: 'Alpa / Belum Presensi', alasan: '-', metode: '-' }
      return {
        'No': index + 1,
        'Nama Lengkap': g.nama,
        'Jenis Kelamin': g.jenis_kelamin,
        'Kelompok': g.kelompok,
        'Kelas / Tingkat': g.kelas,
        'Status Kehadiran': pData.status,
        'Alasan (Izin)': pData.alasan,
        'Metode Presensi': pData.metode,
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(dataToExport)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Presensi')

    const namaAcaraClean = selectedAcaraObj.nama_acara.replace(/[^a-zA-Z0-9]/g, '_')
    const filename = `Rekap_Presensi_${namaAcaraClean}_${selectedAcaraObj.tanggal}.xlsx`

    XLSX.writeFile(workbook, filename)
  }

  // Fitur 2: Cetak / Save As PDF
  const handlePrintPDF = () => {
    if (!selectedAcara) return alert('Pilih acara terlebih dahulu!')
    window.print()
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* CSS Khusus Format Cetak PDF */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Control Panel (Sembunyikan saat di-print) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4 no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Rekap Presensi Viewer</h1>
            <p className="text-sm text-gray-500">
              Laporan ringkasan dan persentase kehadiran generus per acara.
            </p>
          </div>

          {/* Tombol Ekspor & Cetak */}
          {selectedAcara && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportExcel}
                className="px-3.5 py-2 bg-emerald-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-emerald-700 transition flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" /> Export Excel
              </button>
              <button
                onClick={handlePrintPDF}
                className="px-3.5 py-2 bg-slate-800 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-slate-900 transition flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Cetak / PDF
              </button>
            </div>
          )}
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Pilih Acara</label>
            <select
              value={selectedAcara}
              onChange={(e) => setSelectedAcara(e.target.value)}
              className="w-full p-2.5 border rounded-lg bg-gray-50 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium text-stone-800 cursor-pointer"
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
              className="w-full p-2.5 border rounded-lg bg-gray-50 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-500 text-stone-800 cursor-pointer"
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
              className="w-full p-2.5 border rounded-lg bg-gray-50 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-500 text-stone-800 cursor-pointer"
            >
              <option value="Semua">Semua Jenis Kelamin</option>
              <option value="Laki-laki">Laki-laki</option>
              <option value="Perempuan">Perempuan</option>
            </select>
          </div>
        </div>
      </div>

      {/* AREA UTAMA YANG DICETAK / PDF */}
      <div id="print-area" className="space-y-4">
        {/* Header Khusus Tampilan Print PDF */}
        {selectedAcaraObj && (
          <div className="hidden print:block mb-6 border-b pb-4">
            <h2 className="text-2xl font-bold text-gray-900">REKAP PRESENSI GENERUS</h2>
            <p className="text-sm text-gray-600">Acara: {selectedAcaraObj.nama_acara} ({selectedAcaraObj.tanggal})</p>
            <p className="text-sm text-gray-600">Lokasi: {selectedAcaraObj.lokasi || '-'}</p>
          </div>
        )}

        {/* Kartu Statistik Rekap */}
        {selectedAcara && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
              <p className="text-xs text-gray-500 font-medium">Total Generus</p>
              <p className="text-xl font-bold text-gray-800">{totalGenerus}</p>
            </div>

            <div className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
              <p className="text-xs text-gray-500 font-medium">Hadir</p>
              <p className="text-xl font-bold text-green-600">{totalHadir}</p>
            </div>

            <div className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
              <p className="text-xs text-gray-500 font-medium">Izin</p>
              <p className="text-xl font-bold text-amber-600">{totalIzin}</p>
            </div>

            <div className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
              <p className="text-xs text-gray-500 font-medium">Alpa</p>
              <p className="text-xl font-bold text-gray-400">{totalAlpa}</p>
            </div>

            <div className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-100 col-span-2 sm:col-span-1 flex flex-col justify-center">
              <p className="text-xs text-gray-500 font-medium">Kehadiran</p>
              <p className="text-xl font-bold text-blue-600">{persentaseHadir}%</p>
            </div>
          </div>
        )}

        {/* Input Pencarian (Sembunyi saat Cetak) */}
        <div className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-100 relative no-print text-stone-800 ">
          <Search className="w-4 h-4 absolute left-6 top-6 text-gray-400 " />
          <input
            type="text"
            placeholder="Cari nama, kelas, atau kelompok..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Tabel Data Rekap */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {!selectedAcara ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              Silakan pilih acara terlebih dahulu untuk melihat rekap kehadiran.
            </div>
          ) : loading ? (
            <div className="p-8 text-center text-gray-500 text-sm">Memuat data rekap...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500 font-semibold">
                  <tr>
                    <th className="p-4">Nama Generus</th>
                    <th className="p-4">Kelompok</th>
                    <th className="p-4">Kelas</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Alasan / Keterangan</th>
                    <th className="p-4 text-center">Metode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredGenerus.map((g) => {
                    const pData = presensiMap[g.id] || { status: 'Alpa / Belum Presensi', alasan: '-', metode: '-' }

                    return (
                      <tr key={g.id} className="hover:bg-gray-50/50 transition">
                        <td className="p-4">
                          <div className="font-semibold text-gray-800">{g.nama}</div>
                          <div className="text-xs text-gray-400">{g.jenis_kelamin}</div>
                        </td>
                        <td className="p-4 text-gray-600">{g.kelompok}</td>
                        <td className="p-4 text-gray-600">{g.kelas}</td>
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                              pData.status === 'Hadir'
                                ? 'bg-green-100 text-green-700'
                                : pData.status === 'Izin'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {pData.status}
                          </span>
                        </td>
                        <td className="p-4 text-gray-600 text-xs">{pData.alasan}</td>
                        <td className="p-4 text-center text-xs text-gray-400 font-mono">{pData.metode}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}