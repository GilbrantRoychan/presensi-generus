'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Calendar, 
  Plus, 
  Trash2, 
  Edit, 
  MapPin, 
  UserCheck, 
  X, 
  Check,
  Search
} from 'lucide-react'

interface Acara {
  id: string
  nama_acara: string
  tanggal: string
  lokasi: string
  koor: string
}

export default function AdminAcaraPage() {
  const supabase = createClient()
  
  // State Data
  const [acaraList, setAcaraList] = useState<Acara[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // State Modal Form (Tambah & Edit)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAcara, setEditingAcara] = useState<Acara | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    nama_acara: '',
    tanggal: '',
    lokasi: '',
    koor: ''
  })

  useEffect(() => {
    fetchAcara()
  }, [])

  // 1. Fetch Data: Diurutkan dari tanggal terdekat ke terlama (ascending)
  const fetchAcara = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('acara')
      .select('*')
      .order('tanggal', { ascending: true })

    if (data && !error) {
      setAcaraList(data as Acara[])
    }
    setLoading(false)
  }

  // 2. Handler Simpan (Tambah Baru / Edit)
  const handleSaveAcara = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    if (editingAcara) {
      // Update Data
      const { error } = await supabase
        .from('acara')
        .update({
          nama_acara: formData.nama_acara,
          tanggal: formData.tanggal,
          lokasi: formData.lokasi,
          koor: formData.koor
        })
        .eq('id', editingAcara.id)

      if (error) alert('Gagal memperbarui acara: ' + error.message)
      else alert('Acara berhasil diperbarui!')
    } else {
      // Insert Baru
      const { error } = await supabase
        .from('acara')
        .insert([{
          nama_acara: formData.nama_acara,
          tanggal: formData.tanggal,
          lokasi: formData.lokasi,
          koor: formData.koor
        }])

      if (error) alert('Gagal menambahkan acara: ' + error.message)
      else alert('Acara baru berhasil dibuat!')
    }

    setIsSubmitting(false)
    closeModal()
    fetchAcara()
  }

  // 3. Handler Hapus Acara
  const handleDeleteAcara = async (id: string, nama: string) => {
    if (confirm(`Yakin ingin menghapus acara "${nama}"? Data presensi terkait mungkin akan terpengaruh!`)) {
      const { error } = await supabase.from('acara').delete().eq('id', id)
      if (error) alert('Gagal menghapus acara: ' + error.message)
      else fetchAcara()
    }
  }

  // Helper Modal
  const openAddModal = () => {
    setEditingAcara(null)
    setFormData({ nama_acara: '', tanggal: '', lokasi: '', koor: '' })
    setIsModalOpen(true)
  }

  const openEditModal = (item: Acara) => {
    setEditingAcara(item)
    setFormData({
      nama_acara: item.nama_acara,
      tanggal: item.tanggal,
      lokasi: item.lokasi,
      koor: item.koor
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingAcara(null)
  }

  // Filter Pencarian
  const filteredAcara = acaraList.filter(a => 
    a.nama_acara.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.lokasi.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.koor.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Manajemen Acara</h1>
            <p className="text-sm text-slate-500 mt-1">
              Atur agenda kegiatan dan jadwal presensi generus.
            </p>
          </div>

          <button
            onClick={openAddModal}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            Buat Acara Baru
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Cari acara, lokasi, atau koordinator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>
          <div className="text-xs font-semibold text-slate-500 hidden sm:block">
            Total: {filteredAcara.length} Acara
          </div>
        </div>

        {/* Tabel Data Acara */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-12 text-center">No</th>
                  <th className="py-3.5 px-4">Nama Acara</th>
                  <th className="py-3.5 px-4">Tanggal Kegiatan</th>
                  <th className="py-3.5 px-4">Lokasi</th>
                  <th className="py-3.5 px-4">Koordinator</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                      Memuat jadwal acara...
                    </td>
                  </tr>
                ) : filteredAcara.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                      Tidak ada acara yang ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredAcara.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 text-center text-slate-400 font-semibold">{idx + 1}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{item.nama_acara}</td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                          <Calendar className="w-3.5 h-3.5" />
                          {item.tanggal}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {item.lokasi}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        <span className="inline-flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                          {item.koor}
                        </span>
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
                            onClick={() => handleDeleteAcara(item.id, item.nama_acara)}
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

      {/* Modal CRUD (Tambah / Edit Acara) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingAcara ? 'Edit Acara' : 'Buat Acara Baru'}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAcara} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Acara</label>
                <input
                  type="text"
                  required
                  value={formData.nama_acara}
                  onChange={(e) => setFormData({ ...formData, nama_acara: e.target.value })}
                  placeholder="Contoh: Pengajian Sambung Kelompok"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tanggal Kegiatan</label>
                <input
                  type="date"
                  required
                  value={formData.tanggal}
                  onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Lokasi</label>
                <input
                  type="text"
                  required
                  value={formData.lokasi}
                  onChange={(e) => setFormData({ ...formData, lokasi: e.target.value })}
                  placeholder="Contoh: Masjid Utama"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Koordinator (Koor)</label>
                <input
                  type="text"
                  required
                  value={formData.koor}
                  onChange={(e) => setFormData({ ...formData, koor: e.target.value })}
                  placeholder="Contoh: Ahmad"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
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
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition flex items-center gap-1 disabled:bg-slate-300"
                >
                  <Check className="w-4 h-4" />
                  {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}