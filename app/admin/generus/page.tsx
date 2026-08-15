'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, UserPlus, Trash2, QrCode } from 'lucide-react'

export default function AdminGenerusPage() {
  const supabase = createClient()
  const [generusList, setGenerusList] = useState<any[]>([])
  
  // State Form
  const [nama, setNama] = useState('')
  const [kelompok, setKelompok] = useState('')
  const [jenisKelamin, setJenisKelamin] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki')
  const [kelas, setKelas] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchGenerus()
  }, [])

  const fetchGenerus = async () => {
    // Pengurutan Hirarki Konsisten: Kelompok -> Nama -> Jenis Kelamin -> Kelas
    const { data } = await supabase
      .from('generus')
      .select('*')
      .order('kelompok', { ascending: true })
      .order('nama', { ascending: true })
      .order('jenis_kelamin', { ascending: true })
      .order('kelas', { ascending: true })

    if (data) setGenerusList(data)
  }

  const handleAddGenerus = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.from('generus').insert({
      nama,
      kelompok,
      jenis_kelamin: jenisKelamin,
      kelas,
    })

    if (!error) {
      setNama('')
      setKelompok('')
      setKelas('')
      fetchGenerus()
    } else {
      alert('Gagal menambah data generus: ' + error.message)
    }
    setLoading(false)
  }

  const handleDeleteGenerus = async (id: string) => {
    if (confirm('Yakin ingin menghapus data generus ini?')) {
      await supabase.from('generus').delete().eq('id', id)
      fetchGenerus()
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      <div className="flex items-center gap-3 bg-white p-6 rounded-xl shadow-sm border">
        <Users className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Manajemen Data Generus</h1>
          <p className="text-sm text-gray-500">Kelola master data anggota / generus</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Tambah Generus */}
        <div className="bg-white p-6 rounded-xl shadow-sm border h-fit">
          <h2 className="flex items-center gap-2 font-bold text-gray-800 mb-4">
            <UserPlus className="w-5 h-5 text-blue-600" /> Tambah Generus Baru
          </h2>
          <form onSubmit={handleAddGenerus} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nama Lengkap</label>
              <input
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                required
                className="w-full p-2.5 border rounded-lg text-sm"
                placeholder="Contoh: Ahmad Abdullah"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Kelompok</label>
              <input
                type="text"
                value={kelompok}
                onChange={(e) => setKelompok(e.target.value)}
                required
                className="w-full p-2.5 border rounded-lg text-sm"
                placeholder="Contoh: Barat"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Jenis Kelamin</label>
              <select
                value={jenisKelamin}
                onChange={(e) => setJenisKelamin(e.target.value as any)}
                className="w-full p-2.5 border rounded-lg text-sm"
              >
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Kelas / Tingkat</label>
              <input
                type="text"
                value={kelas}
                onChange={(e) => setKelas(e.target.value)}
                required
                className="w-full p-2.5 border rounded-lg text-sm"
                placeholder="Contoh: Remaja"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Menyimpan...' : 'Simpan Data'}
            </button>
          </form>
        </div>

        {/* Tabel Data Generus */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b bg-gray-50 font-bold text-gray-700">
            Daftar Generus Terdaftar ({generusList.length})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100 border-b text-gray-600">
                <tr>
                  <th className="p-3">No</th>
                  <th className="p-3">Kode QR</th>
                  <th className="p-3">Kelompok</th>
                  <th className="p-3">Nama</th>
                  <th className="p-3">JK</th>
                  <th className="p-3">Kelas</th>
                  <th className="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {generusList.map((g, idx) => (
                  <tr key={g.id} className="hover:bg-gray-50">
                    <td className="p-3 text-gray-500">{idx + 1}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 font-mono font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs">
                        <QrCode className="w-3 h-3" /> {g.qr_code_id}
                      </span>
                    </td>
                    <td className="p-3 font-medium">{g.kelompok}</td>
                    <td className="p-3 font-semibold">{g.nama}</td>
                    <td className="p-3">{g.jenis_kelamin}</td>
                    <td className="p-3">{g.kelas}</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleDeleteGenerus(g.id)}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="Hapus Generus"
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