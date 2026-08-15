'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import * as XLSX from 'xlsx'
import { Download, Printer, Filter, Eye } from 'lucide-react'

export default function RekapPage() {
  const supabase = createClient()
  const [acaraList, setAcaraList] = useState<any[]>([])
  const [selectedAcara, setSelectedAcara] = useState<string>('')
  const [rekapData, setRekapData] = useState<any[]>([])
  
  // Custom Toggle Kolom
  const [showColumns, setShowColumns] = useState({
    kelompok: true,
    nama: true,
    jk: true,
    kelas: true,
    status: true,
    waktu: true,
    metode: true,
  })

  useEffect(() => {
    fetchAcara()
  }, [])

  useEffect(() => {
    if (selectedAcara) fetchRekap()
  }, [selectedAcara])

  const fetchAcara = async () => {
    const { data } = await supabase.from('acara').select('*').order('tanggal', { ascending: false })
    if (data) {
      setAcaraList(data)
      if (data.length > 0) setSelectedAcara(data[0].id)
    }
  }

  const fetchRekap = async () => {
    // Pengurutan Hirarki Konsisten: Kelompok -> Nama -> Jenis Kelamin -> Kelas
    const { data } = await supabase
      .from('generus')
      .select(`
        id, nama, kelompok, jenis_kelamin, kelas,
        presensi!left(status, waktu_scanned, metode, acara_id)
      `)
      .order('kelompok', { ascending: true })
      .order('nama', { ascending: true })
      .order('jenis_kelamin', { ascending: true })
      .order('kelas', { ascending: true })

    if (data) {
      const formatted = data.map((g) => {
        const p = Array.isArray(g.presensi) 
          ? g.presensi.find((item: any) => item.acara_id === selectedAcara)
          : null

        return {
          kelompok: g.kelompok,
          nama: g.nama,
          jk: g.jenis_kelamin,
          kelas: g.kelas,
          status: p ? p.status : 'Alpa',
          waktu: p?.waktu_scanned ? new Date(p.waktu_scanned).toLocaleTimeString('id-ID') : '-',
          metode: p?.metode || '-',
        }
      })
      setRekapData(formatted)
    }
  }

  const exportToExcel = () => {
    const activeAcara = acaraList.find(a => a.id === selectedAcara)
    const worksheet = XLSX.utils.json_to_sheet(rekapData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Presensi")
    XLSX.writeFile(workbook, `Rekap_Presensi_${activeAcara?.nama_acara || 'Acara'}.xlsx`)
  }

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Rekapitulasi Kehadiran</h1>
          <p className="text-sm text-gray-500">Portal Publik Viewer Presensi Generus</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
          >
            <Download className="w-4 h-4" /> Export Excel
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 text-sm font-medium"
          >
            <Printer className="w-4 h-4" /> Cetak / PDF
          </button>
        </div>
      </div>

      {/* Filter Acara & Toggle Kolom */}
      <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
        <div className="flex items-center gap-3">
          <Filter className="w-5 h-5 text-blue-600" />
          <select
            value={selectedAcara}
            onChange={(e) => setSelectedAcara(e.target.value)}
            className="w-full md:w-1/3 p-2.5 border rounded-lg bg-gray-50 font-medium"
          >
            {acaraList.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nama_acara} ({a.tanggal})
              </option>
            ))}
          </select>
        </div>

        {/* Toggle Kolom */}
        <div className="flex flex-wrap items-center gap-4 pt-3 border-t text-sm">
          <span className="font-semibold flex items-center gap-1 text-gray-600">
            <Eye className="w-4 h-4" /> Tampilkan Kolom:
          </span>
          {Object.keys(showColumns).map((col) => (
            <label key={col} className="flex items-center gap-1.5 cursor-pointer capitalize text-gray-700">
              <input
                type="checkbox"
                checked={(showColumns as any)[col]}
                onChange={(e) => setShowColumns({ ...showColumns, [col]: e.target.checked })}
                className="rounded text-blue-600"
              />
              {col === 'jk' ? 'Jenis Kelamin' : col}
            </label>
          ))}
        </div>
      </div>

      {/* Tabel Data Rekap */}
      <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="p-3">No</th>
              {showColumns.kelompok && <th className="p-3">Kelompok</th>}
              {showColumns.nama && <th className="p-3">Nama</th>}
              {showColumns.jk && <th className="p-3">Jenis Kelamin</th>}
              {showColumns.kelas && <th className="p-3">Kelas</th>}
              {showColumns.status && <th className="p-3">Status</th>}
              {showColumns.waktu && <th className="p-3">Waktu</th>}
              {showColumns.metode && <th className="p-3">Metode</th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rekapData.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="p-3 text-gray-500">{idx + 1}</td>
                {showColumns.kelompok && <td className="p-3 font-medium">{row.kelompok}</td>}
                {showColumns.nama && <td className="p-3 font-semibold">{row.nama}</td>}
                {showColumns.jk && <td className="p-3">{row.jk}</td>}
                {showColumns.kelas && <td className="p-3">{row.kelas}</td>}
                {showColumns.status && (
                  <td className="p-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        row.status === 'Hadir'
                          ? 'bg-green-100 text-green-700'
                          : row.status === 'Izin'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                )}
                {showColumns.waktu && <td className="p-3 text-gray-500">{row.waktu}</td>}
                {showColumns.metode && <td className="p-3 text-gray-500">{row.metode}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}