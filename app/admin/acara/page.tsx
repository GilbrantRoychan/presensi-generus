'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Calendar, PlusCircle, Trash2 } from 'lucide-react'

export default function AdminAcaraPage() {
  const supabase = createClient()
  const [acaraList, setAcaraList] = useState<any[]>([])

  // State Form
  const [namaAcara, setNamaAcara] = useState('')
  const [tanggal, setTanggal] = useState('')
  const [lokasi, setLokasi] = useState('')
  const [koor, setKoor] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchAcara()
  }, [])

  const fetchAcara = async () => {
    const { data } = await supabase
      .from('acara')
      .select('*')
      .order('tanggal', { ascending: false })

    if (data) setAcaraList(data)
  }

  const handleAddAcara = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.from('acara').insert({
      nama_acara: namaAcara,
      tanggal,
      lokasi,
      koor,
    })

    if (!error) {
      setNamaAcara('')
      setTanggal('')
      setLokasi('')
      setKoor('')
      fetchAcara()
    } else {
      alert('Gagal membuat acara: ' + error.message)
    }
    setLoading(false)
  }

  const handleDeleteAcara = async (id: string) => {
    if (confirm('Yakin ingin menghapus acara ini? Seluruh data presensi terkait acara ini akan terhapus!')) {
      await supabase.from('acara').delete().eq('id', id)
      fetchAcara()
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      <div className="flex items-center gap-3 bg-white p-6 rounded-xl shadow-sm border">
        <Calendar className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Manajemen Data Acara</h1>
          <p className="text-sm text-gray-500">Buat dan atur agenda kegiatan presensi</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Buat Acara Baru */}
        <div className="bg-white p-6 rounded-xl shadow-sm border h-fit">
          <h2 className="flex items-center gap-2 font-bold text-gray-800 mb-4">
            <PlusCircle className="w-5 h-5 text-blue-600" /> Buat Acara Baru
          </h2>
          <form onSubmit={handleAddAcara} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nama Acara</label>
              <input
                type="text"
                value={namaAcara}
                onChange={(e) => setNamaAcara(e.target.value)}
                required
                className="w-full p-2.5 border rounded-lg text-sm"
                placeholder="Contoh: Pengajian Sambung Kelompok"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tanggal</label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                required
                className="w-full p-2.5 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Lokasi</label>
              <input
                type="text"
                value={lokasi}
                onChange={(e) => setLokasi(e.target.value)}
                required
                className="w-full p-2.5 border rounded-lg text-sm"
                placeholder="Contoh: Masjid Utama"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Koordinator (Koor)</label>
              <input
                type="text"
                value={koor}
                onChange={(e) => setKoor(e.target.value)}
                required
                className="w-full p-2.5 border rounded-lg text-sm"
                placeholder="Contoh: Ahmad"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Menyimpan...' : 'Simpan Acara'}
            </button>
          </form>
        </div>

        {/* Tabel Data Acara */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b bg-gray-50 font-bold text-gray-700">
            Daftar Acara ({acaraList.length})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100 border-b text-gray-600">
                <tr>
                  <th className="p-3">No</th>
                  <th className="p-3">Nama Acara</th>
                  <th className="p-3">Tanggal</th>
                  <th className="p-3">Lokasi</th>
                  <th className="p-3">Koor</th>
                  <th className="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {acaraList.map((a, idx) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="p-3 text-gray-500">{idx + 1}</td>
                    <td className="p-3 font-semibold">{a.nama_acara}</td>
                    <td className="p-3 font-medium">{a.tanggal}</td>
                    <td className="p-3">{a.lokasi}</td>
                    <td className="p-3">{a.koor}</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleDeleteAcara(a.id)}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="Hapus Acara"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}