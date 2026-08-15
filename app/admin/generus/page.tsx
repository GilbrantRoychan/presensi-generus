'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import * as XLSX from 'xlsx'
import { Plus, Download, Upload, Trash2, Search, FileSpreadsheet } from 'lucide-react'

export default function GenerusAdminPage() {
  const [generusList, setGenerusList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  
  // Form Tambah Generus Manual
  const [nama, setNama] = useState('')
  const [jenisKelamin, setJenisKelamin] = useState('L')
  const [kelompok, setKelompok] = useState('Sembung')
  const [kelas, setKelas] = useState('Pra Remaja')
  const [qrCodeId, setQrCodeId] = useState('')

  const supabase = createClient()

  useEffect(() => {
    fetchGenerus()
  }, [])

  const fetchGenerus = async () => {
    setLoading(true)
    const { data } = await supabase.from('generus').select('*').order('created_at', { ascending: false })
    if (data) setGenerusList(data)
    setLoading(false)
  }

  // 1. Fungsi Download Template Excel
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        nama: 'Ahmad Fulan',
        jenis_kelamin: 'L',
        kelompok: 'Sembung',
        kelas: 'Pra Remaja',
        qr_code_id: 'GEN-001',
      },
      {
        nama: 'Fatimah Az-Zahra',
        jenis_kelamin: 'P',
        kelompok: 'Tamantirto',
        kelas: 'Remaja',
        qr_code_id: 'GEN-002',
      },
    ]

    const worksheet = XLSX.utils.json_to_sheet(templateData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template_Generus')
    XLSX.writeFile(workbook, 'Template_Import_Generus_Tamantirto.xlsx')
  }

  // 2. Fungsi Import Data dari Excel / CSV
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result
        const workbook = XLSX.read(bstr, { type: 'binary' })
        const wsname = workbook.SheetNames[0]
        const ws = workbook.Sheets[wsname]
        const data: any[] = XLSX.utils.sheet_to_json(ws)

        if (data.length === 0) {
          alert('File kosong atau format tidak sesuai!')
          return
        }

        // Validasi dan format data untuk insert Supabase
        const formattedData = data.map((item) => ({
          nama: item.nama || item.Nama,
          jenis_kelamin: (item.jenis_kelamin || item.Jenis_Kelamin || 'L').toUpperCase(),
          kelompok: item.kelompok || item.Kelompok || 'Sembung',
          kelas: item.kelas || item.Kelas || 'Pra Remaja',
          qr_code_id: item.qr_code_id || item.QR_Code_ID || `GEN-${Math.floor(1000 + Math.random() * 9000)}`,
        }))

        const { error } = await supabase.from('generus').insert(formattedData)

        if (error) {
          alert('Gagal mengimport data: ' + error.message)
        } else {
          alert(`Berhasil mengimport ${formattedData.length} data generus!`)
          fetchGenerus()
        }
      } catch (err) {
        alert('Terjadi kesalahan saat membaca file Excel!')
      }
    }
    reader.readAsBinaryString(file)
  }

  // 3. Fungsi Submit Manual 1 Data
  const handleSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nama) return alert('Nama Generus wajib diisi!')

    const { error } = await supabase.from('generus').insert({
      nama,
      jenis_kelamin: jenisKelamin,
      kelompok,
      kelas,
      qr_code_id: qrCodeId || `GEN-${Math.floor(1000 + Math.random() * 9000)}`,
    })

    if (!error) {
      setNama('')
      setQrCodeId('')
      fetchGenerus()
    } else {
      alert('Gagal menambah data: ' + error.message)
    }
  }

  // 4. Hapus Data
  const handleDelete = async (id: string) => {
    if (confirm('Yakin ingin menghapus data generus ini?')) {
      const { error } = await supabase.from('generus').delete().eq('id', id)
      if (!error) fetchGenerus()
    }
  }

  const filteredGenerus = generusList.filter(
    (g) =>
      g.nama?.toLowerCase().includes(search.toLowerCase()) ||
      g.kelompok?.toLowerCase().includes(search.toLowerCase()) ||
      g.kelas?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Action Bar: Import & Download Template */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Data Generus</h2>
          <p className="text-xs text-slate-500">Kelola master data generus atau import sekaligus dari file Excel.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tombol Download Template */}
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition border border-slate-300"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Download Template Excel
          </button>

          {/* Tombol Import File */}
          <label className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition shadow-sm">
            <Upload className="w-4 h-4" /> Import Excel / CSV
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Input Manual 1 Data */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600" /> Tambah Manual
          </h3>
          <form onSubmit={handleSubmitManual} className="space-y-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Nama Generus</label>
              <input
                type="text"
                placeholder="Contoh: Ahmad Fulan"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Jenis Kelamin</label>
                <select
                  value={jenisKelamin}
                  onChange={(e) => setJenisKelamin(e.target.value)}
                  className="w-full p-2 border rounded-lg outline-none bg-white"
                >
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Kelompok</label>
                <input
                  type="text"
                  placeholder="Contoh: Sembung"
                  value={kelompok}
                  onChange={(e) => setKelompok(e.target.value)}
                  className="w-full p-2 border rounded-lg outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Kelas / Usia</label>
                <select
                  value={kelas}
                  onChange={(e) => setKelas(e.target.value)}
                  className="w-full p-2 border rounded-lg outline-none bg-white"
                >
                  <option value="Caberawit PAUD">Caberawit PAUD</option>
                  <option value="Caberawit SD">Caberawit SD</option>
                  <option value="Pra Remaja">Pra Remaja</option>
                  <option value="Remaja">Remaja</option>
                  <option value="Usia Nikah">Usia Nikah</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">ID QR Code (Opsional)</label>
                <input
                  type="text"
                  placeholder="Otomatis jika kosong"
                  value={qrCodeId}
                  onChange={(e) => setQrCodeId(e.target.value)}
                  className="w-full p-2 border rounded-lg outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition mt-2"
            >
              Simpan Data
            </button>
          </form>
        </div>

        {/* Tabel List Generus */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
            <div className="relative w-full max-w-xs">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari generus..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border rounded-lg outline-none bg-white"
              />
            </div>
            <span className="text-xs text-slate-500 font-medium">Total: {filteredGenerus.length}</span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-semibold border-b uppercase">
                  <th className="p-3">Nama</th>
                  <th className="p-3">L/P</th>
                  <th className="p-3">Kelompok</th>
                  <th className="p-3">Kelas</th>
                  <th className="p-3">ID QR</th>
                  <th className="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center p-6 text-slate-500">Memuat data generus...</td>
                  </tr>
                ) : filteredGenerus.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center p-6 text-slate-500">Data generus belum ada.</td>
                  </tr>
                ) : (
                  filteredGenerus.map((g) => (
                    <tr key={g.id} className="hover:bg-slate-50">
                      <td className="p-3 font-semibold text-slate-800">{g.nama}</td>
                      <td className="p-3 font-medium">{g.jenis_kelamin}</td>
                      <td className="p-3 text-slate-600">{g.kelompok}</td>
                      <td className="p-3 text-slate-600">{g.kelas}</td>
                      <td className="p-3 font-mono text-slate-500">{g.qr_code_id}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleDelete(g.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}