'use client'

import { useState, useEffect, ChangeEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import * as XLSX from 'xlsx'
import { 
  Users, 
  Search, 
  Plus, 
  Download, 
  Upload, 
  Edit, 
  Trash2, 
  X, 
  Check, 
  FileSpreadsheet,
  Filter 
} from 'lucide-react'

// Interface Data Generus
interface Generus {
  id?: string
  nama: string
  kelompok: string
  jenis_kelamin: string
  kelas?: string
  qr_code?: string
}

export default function AdminGenerusPage() {
  const supabase = createClient()
  
  // State Utama
  const [generusList, setGenerusList] = useState<Generus[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedKelompok, setSelectedKelompok] = useState('Semua Kelompok')

  // State Modal CRUD
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [editingData, setEditingData] = useState<Generus | null>(null)
  const [formData, setFormData] = useState<Generus>({
    nama: '',
    kelompok: 'Gonjen 1',
    jenis_kelamin: 'Laki-laki',
    kelas: 'Pra Remaja'
  })

  // State File Import
  const [importFile, setImportFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetchGenerus()
  }, [])

  // 1. Fetch Data dari Supabase
  const fetchGenerus = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('generus')
      .select('*')
      .order('nama', { ascending: true })

    if (data && !error) {
      setGenerusList(data as Generus[])
    }
    setLoading(false)
  }

  // 2. Fungsi Tambah & Edit Manual
  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nama.trim()) return alert('Nama lengkap wajib diisi!')

    if (editingData?.id) {
      // Update
      const { error } = await supabase
        .from('generus')
        .update({
          nama: formData.nama,
          kelompok: formData.kelompok,
          jenis_kelamin: formData.jenis_kelamin,
          kelas: formData.kelas
        })
        .eq('id', editingData.id)

      if (error) alert('Gagal memperbarui data: ' + error.message)
      else alert('Data berhasil diperbarui!')
    } else {
      // Insert Baru
      const { error } = await supabase
        .from('generus')
        .insert([{
          nama: formData.nama,
          kelompok: formData.kelompok,
          jenis_kelamin: formData.jenis_kelamin,
          kelas: formData.kelas
        }])

      if (error) alert('Gagal menambah data: ' + error.message)
      else alert('Data baru berhasil ditambahkan!')
    }

    closeModal()
    fetchGenerus()
  }

  // 3. Fungsi Hapus Data
  const handleDelete = async (id: string, nama: string) => {

    if (confirm(`Apakah Anda yakin ingin menghapus data ${nama}?`)) {
      const { error } = await supabase
        .from('generus')
        .delete()
        .eq('id', id)

      if (error) alert('Gagal menghapus data: ' + error.message)
      else {
        alert('Data berhasil dihapus!')
        fetchGenerus()
      }
    }
  }

  // 4. Download Template Excel/CSV
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        nama: 'Contoh Nama Generus 1',
        kelompok: 'Gonjen 1',
        jenis_kelamin: 'Laki-laki',
        kelas: 'Pra Remaja'
      },
      {
        nama: 'Contoh Nama Generus 2',
        kelompok: 'Gonjen 2',
        jenis_kelamin: 'Perempuan',
        kelas: 'Remaja'
      }
    ]

    const worksheet = XLSX.utils.json_to_sheet(templateData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Generus')
    XLSX.writeFile(workbook, 'Template_Import_Generus.xlsx')
  }

  // 5. Import Massal (Bulk Upload Excel / CSV)
  const handleImportExcel = async () => {
    if (!importFile) return alert('Pilih berkas Excel/CSV terlebih dahulu!')

    setUploading(true)
    const reader = new FileReader()

    reader.onload = async (e) => {
      try {
        const buffer = e.target?.result
        const workbook = XLSX.read(buffer, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const parsedData: any[] = XLSX.utils.sheet_to_json(sheet)

        if (parsedData.length === 0) {
          alert('File kosong atau format tidak sesuai!')
          setUploading(false)
          return
        }

        // Format data agar sesuai kolom Supabase
        const formattedData = parsedData.map((row) => ({
          nama: row.nama || row.Nama || row['NAMA LENGKAP'] || '',
          kelompok: row.kelompok || row.Kelompok || 'Gonjen 1',
          jenis_kelamin: row.jenis_kelamin || row['Jenis Kelamin'] || row.JK || 'Laki-laki',
          kelas: row.kelas || row.Kelas || row['Kelas / Tingkat'] || 'Pra Remaja'
        })).filter(item => item.nama.trim() !== '')

        const { error } = await supabase
          .from('generus')
          .insert(formattedData)

        if (error) {
          alert('Gagal mengimpor data: ' + error.message)
        } else {
          alert(`Berhasil mengimpor ${formattedData.length} data generus!`)
          setIsImportModalOpen(false)
          setImportFile(null)
          fetchGenerus()
        }
      } catch (err) {
        console.error(err)
        alert('Terjadi kesalahan saat membaca file!')
      } finally {
        setUploading(false)
      }
    }

    reader.readAsBinaryString(importFile)
  }

  // Helper Modal
  const openAddModal = () => {
    setEditingData(null)
    setFormData({ nama: '', kelompok: 'Gonjen 1', jenis_kelamin: 'Laki-laki', kelas: 'Pra Remaja' })
    setIsModalOpen(true)
  }

  const openEditModal = (item: Generus) => {
    setEditingData(item)
    setFormData({
      nama: item.nama,
      kelompok: item.kelompok || 'Gonjen 1',
      jenis_kelamin: item.jenis_kelamin || 'Laki-laki',
      kelas: item.kelas || 'Pra Remaja'
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingData(null)
  }

  // 1. Filtering Data berdasarkan Kelompok dan Pencarian
  const kelompokList = Array.from(new Set(generusList.map(g => g.kelompok).filter(Boolean)))
  
  const filteredGenerus = generusList.filter(g => {
    const matchKelompok = selectedKelompok === 'Semua Kelompok' || g.kelompok === selectedKelompok
    const matchSearch = g.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        (g.kelas && g.kelas.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchKelompok && matchSearch
  })

  // 2. Ringkasan Statistik Dinamis (Mengikuti Data yang Difilter)
  const totalGenerus = filteredGenerus.length
  const totalLaki = filteredGenerus.filter(g => g.jenis_kelamin?.toLowerCase().includes('laki')).length
  const totalPerempuan = filteredGenerus.filter(g => g.jenis_kelamin?.toLowerCase().includes('perempuan')).length

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        
        {/* Header Section & Action Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Data Generus</h1>
            <p className="text-sm text-slate-500 mt-1">
              Kelola dan lihat ringkasan data seluruh anggota generus.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Template Excel
            </button>

            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <Upload className="w-4 h-4" />
              Import Data
            </button>

            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" />
              Tambah Manual
            </button>
          </div>
        </div>

        {/* Ringkasan Metrics Dinamis */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Generus {selectedKelompok !== 'Semua Kelompok' && `(${selectedKelompok})`}
              </p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{totalGenerus}</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Laki-laki</p>
              <p className="text-2xl font-extrabold text-blue-600 mt-1">{totalLaki}</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Perempuan</p>
              <p className="text-2xl font-extrabold text-pink-600 mt-1">{totalPerempuan}</p>
            </div>
            <div className="p-3 bg-pink-50 text-pink-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama atau kelas generus..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedKelompok}
              onChange={(e) => setSelectedKelompok(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Semua Kelompok">Semua Kelompok</option>
              {kelompokList.map((kel) => (
                <option key={kel} value={kel}>{kel}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabel Data Generus */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Nama Lengkap</th>
                  <th className="py-3.5 px-4">Kelompok</th>
                  <th className="py-3.5 px-4">Jenis Kelamin</th>
                  <th className="py-3.5 px-4">Kelas / Tingkat</th>
                  <th className="py-3.5 px-4 text-center">Kode QR</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                      Memuat data generus...
                    </td>
                  </tr>
                ) : filteredGenerus.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                      Data tidak ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredGenerus.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{item.nama}</td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">{item.kelompok || '-'}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          item.jenis_kelamin?.toLowerCase().includes('perempuan')
                            ? 'bg-pink-50 text-pink-600 border border-pink-100'
                            : 'bg-blue-50 text-blue-600 border border-blue-100'
                        }`}>
                          {item.jenis_kelamin}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">{item.kelas || '-'}</td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-400 text-xs">
                        {item.qr_code || item.id?.slice(0, 6).toUpperCase() || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id!, item.nama)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* Modal CRUD Manual (Tambah / Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingData ? 'Edit Data Generus' : 'Tambah Generus Manual'}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveManual} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  placeholder="Masukkan nama lengkap..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Kelompok</label>
                <select
                  value={formData.kelompok}
                  onChange={(e) => setFormData({ ...formData, kelompok: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Gonjen 1">Gonjen 1</option>  
                  <option value="Gonjen 2">Gonjen 2</option>
                  <option value="Gonjen 3">Kembaran</option>
                  <option value="Gonjen 4">Sembung</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jenis Kelamin</label>
                  <select
                    value={formData.jenis_kelamin}
                    onChange={(e) => setFormData({ ...formData, jenis_kelamin: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kelas / Tingkat</label>
                  <select
                    value={formData.kelas}
                    onChange={(e) => setFormData({ ...formData, kelas: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              >
                    <option value="Pra Remaja">Pra Remaja</option>
                    <option value="Remaja">Remaja</option>
                    <option value="Pra Nikah">Pra Nikah</option>
                    <option value="Mandiri">Mandiri</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition flex items-center gap-1"
                >
                  <Check className="w-4 h-4" />
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Import Data Excel */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Import Data Generus (.xlsx / .csv)</h3>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              <p className="text-slate-500">
                Gunakan template Excel resmi agar format kolom sesuai saat diunggah ke sistem.
              </p>

              <div className="border-2 border-dashed border-slate-200 p-6 rounded-2xl text-center bg-slate-50/50">
                <FileSpreadsheet className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    if (e.target.files?.[0]) setImportFile(e.target.files[0])
                  }}
                  className="hidden"
                  id="excel-input"
                />
                <label
                  htmlFor="excel-input"
                  className="cursor-pointer text-blue-600 font-bold hover:underline block"
                >
                  {importFile ? importFile.name : 'Pilih Berkas Excel / CSV'}
                </label>
                <span className="text-[11px] text-slate-400 mt-1 block">Mendukung format .xlsx, .xls, .csv</span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={uploading || !importFile}
                  onClick={handleImportExcel}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl font-bold transition flex items-center gap-1.5"
                >
                  <Upload className="w-4 h-4" />
                  {uploading ? 'Memproses...' : 'Upload & Impor'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}