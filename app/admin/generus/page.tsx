'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, UserCheck, Search, Filter } from 'lucide-react'

export default function GenerusPage() {
  const supabase = createClient()
  const [generusList, setGenerusList] = useState<any[]>([])
  const [selectedKelompok, setSelectedKelompok] = useState<string>('Semua')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchGenerus()
  }, [])

  const fetchGenerus = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('generus')
      .select('*')
      .order('kelompok', { ascending: true })
      .order('nama', { ascending: true })

    if (data) setGenerusList(data)
    setLoading(false)
  }

  // Filter Data Berdasarkan Kelompok dan Search
  const filteredGenerus = generusList.filter((g) => {
    const matchKelompok = selectedKelompok === 'Semua' || g.kelompok === selectedKelompok
    const matchSearch =
      g.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.kelas.toLowerCase().includes(searchQuery.toLowerCase())
    return matchKelompok && matchSearch
  })

  // Kalkulasi Rekap berdasarkan data hasil filter
  const totalGenerus = filteredGenerus.length
  const totalLaki = filteredGenerus.filter((g) => g.jenis_kelamin === 'Laki-laki').length
  const totalPerempuan = filteredGenerus.filter((g) => g.jenis_kelamin === 'Perempuan').length

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Data Generus</h1>
          <p className="text-sm text-gray-500">Kelola dan lihat ringkasan data seluruh anggota generus.</p>
        </div>

        {/* Filter Kelompok */}
        <div className="flex items-center gap-2 bg-white p-2 border rounded-lg shadow-sm">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={selectedKelompok}
            onChange={(e) => setSelectedKelompok(e.target.value)}
            className="text-sm bg-transparent outline-none font-medium text-gray-700 cursor-pointer"
          >
            <option value="Semua">Semua Kelompok</option>
            <option value="Gonjen 1">Gonjen 1</option>
            <option value="Gonjen 2">Gonjen 2</option>
            <option value="Kembaran">Kembaran</option>
            <option value="Sembung">Sembung</option>
          </select>
        </div>
      </div>

      {/* Kartu Ringkasan Status Generus */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium">Total Generus</p>
            <p className="text-2xl font-bold text-gray-800">{totalGenerus}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium">Laki-laki</p>
            <p className="text-2xl font-bold text-blue-600">{totalLaki}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium">Perempuan</p>
            <p className="text-2xl font-bold text-pink-600">{totalPerempuan}</p>
          </div>
          <div className="p-3 bg-pink-50 text-pink-600 rounded-lg">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Box Pencarian */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative">
        <Search className="w-4 h-4 absolute left-7 top-7 text-gray-400" />
        <input
          type="text"
          placeholder="Cari nama atau kelas generus..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Tabel Data Generus */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Memuat data generus...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500 font-semibold">
                <tr>
                  <th className="p-4">Nama Lengkap</th>
                  <th className="p-4">Kelompok</th>
                  <th className="p-4">Jenis Kelamin</th>
                  <th className="p-4">Kelas / Tingkat</th>
                  <th className="p-4">Kode QR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredGenerus.map((g) => (
                  <tr key={g.id} className="hover:bg-gray-50/50 transition">
                    <td className="p-4 font-semibold text-gray-800">{g.nama}</td>
                    <td className="p-4 text-gray-600">{g.kelompok}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        g.jenis_kelamin === 'Laki-laki' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'
                      }`}>
                        {g.jenis_kelamin}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600">{g.kelas}</td>
                    <td className="p-4 font-mono text-xs text-gray-400">{g.qr_code_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}