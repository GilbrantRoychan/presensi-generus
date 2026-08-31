'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, Search, Download, Printer } from 'lucide-react'
import * as XLSX from 'xlsx'

export default function RekapPage() {
  const supabase = createClient()
  const [acaraList, setAcaraList] = useState<any[]>([])
  const [selectedAcara, setSelectedAcara] = useState<string>('')
  const [selectedAcaraObj, setSelectedAcaraObj] = useState<any>(null)
  const [generusList, setGenerusList] = useState<any[]>([])
  const [presensiMap, setPresensiMap] = useState<{ [key: string]: { status: string; alasan: string } }>({})

  // Filter State
  const [selectedKelompok, setSelectedKelompok] = useState<string>('Semua')
  const [selectedJK, setSelectedJK] = useState<string>('Semua')
  const [selectedStatus, setSelectedStatus] = useState<string>('Semua')
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
    const { data } = await supabase
      .from('acara')
      .select('*')
      .order('tanggal', { ascending: false })
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
        pMap[g.id] = { status: 'Alpa / Belum Presensi', alasan: '-' }
      })

      if (presensiData) {
        presensiData.forEach((p) => {
          let currentStatus = p.status
          if (
            currentStatus === 'sakit' ||
            currentStatus === 'Sakit' ||
            currentStatus === 'izin' ||
            currentStatus === 'Izin'
          ) {
            currentStatus = 'Izin'
          } else if (currentStatus === 'hadir' || currentStatus === 'Hadir') {
            currentStatus = 'Hadir'
          } else {
            currentStatus = 'Alpa / Belum Presensi'
          }
          pMap[p.generus_id] = { status: currentStatus, alasan: p.alasan || '-' }
        })
      }
      setPresensiMap(pMap)
    }
    setLoading(false)
  }

  // Filter Data
  const filteredGenerus = generusList.filter((g) => {
    const statusGenerus = presensiMap[g.id]?.status || 'Alpa / Belum Presensi'
    const matchKelompok = selectedKelompok === 'Semua' || g.kelompok === selectedKelompok
    const matchJK = selectedJK === 'Semua' || g.jenis_kelamin === selectedJK
    const matchStatus = selectedStatus === 'Semua' || statusGenerus === selectedStatus
    const matchSearch =
      g.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.kelas.toLowerCase().includes(searchQuery.toLowerCase())

    return matchKelompok && matchJK && matchStatus && matchSearch
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
      const pData = presensiMap[g.id] || { status: 'Alpa / Belum Presensi', alasan: '-' }
      return {
        'No': index + 1,
        'Nama Lengkap': g.nama,
        'Jenis Kelamin': g.jenis_kelamin,
        'Kelompok': g.kelompok,
        'Kelas / Tingkat': g.kelas,
        'Status Kehadiran': pData.status,
        'Alasan (Izin)': pData.alasan,
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
    <div className="min-h-screen bg-slate-900 print:bg-white print:p-0">
      <div className="max-w-6xl mx-auto px-3 pt-13 pb-4 sm:px-4 sm:pt-13 sm:pb-4 lg:px-4 lg:pt-13 lg:pb-4 space-y-4 sm:space-y-6 print:max-w-none print:p-0 print:m-0">
        {/* CSS Khusus Format Cetak PDF Presisi */}
        <style jsx global>{`
          @media print {
            @page {
              size: A4 portrait;
              margin: 12mm;
            }
            body {
              background-color: white !important;
              color: black !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body * {
              visibility: hidden;
            }
            #print-area,
            #print-area * {
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
            .print-border-table th,
            .print-border-table td {
              border: 1px solid #d1d5db !important;
            }
          }
        `}</style>

        {/* Control Panel (Sembunyikan saat di-print) */}
        <div className="no-print">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
          </Link>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 space-y-4 no-print">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-800">Rekap Presensi Viewer</h1>
              <p className="text-sm text-gray-500">
                Laporan ringkasan dan persentase kehadiran generus per acara.
              </p>
            </div>

            {/* Tombol Ekspor & Cetak */}
            {selectedAcara && (
              <div className="flex flex-wrap items-center gap-2">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
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
                <option value="GONJEN 1">GONJEN 1</option>
                <option value="GONJEN 2">GONJEN 2</option>
                <option value="KEMBARAN">KEMBARAN</option>
                <option value="SEMBUNG">SEMBUNG</option>
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

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Filter Status Kehadiran</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full p-2.5 border rounded-lg bg-gray-50 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-500 text-stone-800 cursor-pointer font-medium"
              >
                <option value="Semua">Semua Status</option>
                <option value="Hadir">Hadir</option>
                <option value="Izin">Izin</option>
                <option value="Alpa / Belum Presensi">Alpa / Belum Presensi</option>
              </select>
            </div>
          </div>
        </div>

        {/* AREA UTAMA YANG DICETAK / PDF */}
        <div id="print-area" className="space-y-4">
          {/* Header Format Laporan Resmi untuk Cetak PDF */}
          {selectedAcaraObj && (
            <div className="hidden print:block mb-4">
              <div className="border-t-2 border-b-2 border-gray-800 py-3 mb-4 text-center">
                <h1 className="text-xl font-black tracking-wide text-gray-900 uppercase">
                  LAPORAN REKAPITULASI PRESENSI
                </h1>
              </div>

              {/* Grid Metadata Laporan */}
              <div className="grid grid-cols-2 gap-y-1.5 text-xs text-gray-800 font-medium mb-4">
                <div>
                  <span className="font-bold">Nama Acara:</span> {selectedAcaraObj.nama_acara?.toUpperCase()}
                </div>
                <div>
                  <span className="font-bold">Tanggal:</span> {selectedAcaraObj.tanggal}
                </div>
                <div>
                  <span className="font-bold">Lokasi:</span> {selectedAcaraObj.lokasi || '-'}
                </div>
                <div>
                  <span className="font-bold">Koordinator:</span> {selectedAcaraObj.koor || '-'}
                </div>
              </div>
            </div>
          )}

          {/* Kartu Statistik Rekap */}
          {selectedAcara && (
            <div className="grid grid-cols-5 gap-3 print:gap-2 mb-4">
              <div className="bg-white p-3 rounded-xl print:rounded-lg shadow-sm print:shadow-none border border-gray-200 flex flex-col justify-between">
                <p className="text-[11px] text-gray-600 font-semibold leading-tight">Total Generus</p>
                <p className="text-lg print:text-base font-bold text-gray-900 mt-1">{totalGenerus}</p>
              </div>
              <div className="bg-white p-3 rounded-xl print:rounded-lg shadow-sm print:shadow-none border border-gray-200 flex flex-col justify-between">
                <p className="text-[11px] text-gray-600 font-semibold leading-tight">Hadir</p>
                <p className="text-lg print:text-base font-bold text-green-600 mt-1">{totalHadir}</p>
              </div>
              <div className="bg-white p-3 rounded-xl print:rounded-lg shadow-sm print:shadow-none border border-gray-200 flex flex-col justify-between">
                <p className="text-[11px] text-gray-600 font-semibold leading-tight">Izin</p>
                <p className="text-lg print:text-base font-bold text-amber-600 mt-1">{totalIzin}</p>
              </div>
              <div className="bg-white p-3 rounded-xl print:rounded-lg shadow-sm print:shadow-none border border-gray-200 flex flex-col justify-between">
                <p className="text-[11px] text-gray-600 font-semibold leading-tight">Alpa</p>
                <p className="text-lg print:text-base font-bold text-gray-500 mt-1">{totalAlpa}</p>
              </div>
              <div className="bg-white p-3 rounded-xl print:rounded-lg shadow-sm print:shadow-none border border-gray-200 flex flex-col justify-between">
                <p className="text-[11px] text-gray-600 font-semibold leading-tight">Persentase</p>
                <p className="text-lg print:text-base font-bold text-blue-600 mt-1">{persentaseHadir}%</p>
              </div>
            </div>
          )}

          {/* Input Pencarian (Sembunyi saat Cetak) */}
          <div className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-100 relative no-print text-stone-800">
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
          <div className="bg-white rounded-xl print:rounded-none shadow-sm print:shadow-none border border-gray-100 print:border-none overflow-hidden">
            {!selectedAcara ? (
              <div className="p-8 text-center text-gray-400 text-sm no-print">
                Silakan pilih acara terlebih dahulu untuk melihat rekap kehadiran.
              </div>
            ) : loading ? (
              <div className="p-8 text-center text-gray-500 text-sm no-print">Memuat data rekap...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm print:text-xs print-border-table border-collapse">
                  <thead className="bg-gray-50 print:bg-white border-b text-xs print:text-[11px] uppercase text-gray-700 font-bold">
                    <tr>
                      <th className="p-3 print:p-2 border-gray-200 w-2/5">NAMA GENERUS</th>
                      <th className="p-3 print:p-2 border-gray-200 w-1/4">KELOMPOK / KELAS</th>
                      <th className="p-3 print:p-2 border-gray-200 w-1/5">STATUS KEHADIRAN</th>
                      <th className="p-3 print:p-2 border-gray-200">ALASAN (IZIN / SAKIT)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 print:divide-gray-300">
                    {filteredGenerus.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-gray-400 text-sm">
                          Tidak ada data generus yang sesuai dengan filter.
                        </td>
                      </tr>
                    ) : (
                      filteredGenerus.map((g) => {
                        const pData = presensiMap[g.id] || { status: 'Alpa / Belum Presensi', alasan: '-' }

                        return (
                          <tr key={g.id} className="hover:bg-gray-50/50 transition">
                            <td className="p-3 print:p-2 border-gray-200">
                              <div className="font-bold text-gray-900 uppercase tracking-wide print:text-[11px]">
                                {g.nama}
                              </div>
                              <div className="text-xs print:text-[10px] text-gray-500 capitalize">{g.jenis_kelamin}</div>
                            </td>
                            <td className="p-3 print:p-2 border-gray-200 text-gray-700 font-medium">
                              <div>{g.kelompok}</div>
                              <div className="text-xs print:text-[10px] text-gray-500">{g.kelas}</div>
                            </td>
                            <td className="p-3 print:p-2 border-gray-200">
                              <span
                                className={`inline-flex items-center px-2.5 py-1 print:px-0 print:py-0 rounded-full print:rounded-none text-xs print:text-[11px] font-semibold ${
                                  pData.status === 'Hadir'
                                    ? 'bg-green-100 print:bg-transparent text-green-700 print:text-gray-900'
                                    : pData.status === 'Izin'
                                    ? 'bg-amber-100 print:bg-transparent text-amber-700 print:text-gray-900'
                                    : 'bg-gray-100 print:bg-transparent text-gray-500 print:text-gray-900'
                                }`}
                              >
                                {pData.status}
                              </span>
                            </td>
                            <td className="p-3 print:p-2 border-gray-200 text-gray-700 text-xs print:text-[11px]">
                              {pData.alasan}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
