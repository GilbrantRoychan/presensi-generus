'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Trash2, Edit3, Save, X, Search, Filter } from 'lucide-react'

export default function RekapAdminEditPage() {
  const [presensi, setPresensi] = useState<any[]>([])
  const [acaraList, setAcaraList] = useState<any[]>([])
  const [selectedAcara, setSelectedAcara] = useState<string>('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editStatus, setEditStatus] = useState<string>('hadir')
  const supabase = createClient()

  useEffect(() => {
    fetchAcara()
  }, [])

  useEffect(() => {
    fetchPresensi()
  }, [selectedAcara])

  const fetchAcara = async () => {
    const { data } = await supabase.from('acara').select('*').order('created_at', { ascending: false })
    if (data) setAcaraList(data)
  }

  const fetchPresensi = async () => {
    setLoading(true)
    let query = supabase
      .from('presensi')
      .select('*, generus(nama, kelas, kelompok), acara(nama_acara)')
      .order('created_at', { ascending: false })

    if (selectedAcara) {
      query = query.eq('acara_id', selectedAcara)
    }

    const { data, error } = await query
    if (!error && data) setPresensi(data)
    setLoading(false)
  }

  const handleUpdateStatus = async (id: string) => {
    const { error } = await supabase.from('presensi').update({ status: editStatus }).eq('id', id)
    if (!error) {
      setEditingId(null)
      fetchPresensi()
    } else {
      alert('Gagal memperbarui status')
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus data presensi ini?')) {
      const { error } = await supabase.from('presensi').delete().eq('id', id)
      if (!error) {
        fetchPresensi()
      } else {
        alert('Gagal menghapus data')
      }
    }
  }

  const filteredPresensi = presensi.filter((p) =>
    p.generus?.nama?.toLowerCase().includes(search.toLowerCase()) ||
    p.generus?.kelompok?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Kelola & Edit Rekap Presensi</h2>
        
        {/* Filter & Search */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama generus atau kelompok..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="relative">
            <Filter className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
            <select
              value={selectedAcara}
              onChange={(e) => setSelectedAcara(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">-- Semua Acara --</option>
              {acaraList.map((a) => (
                <option key={a.id} value={a.id}>{a.nama_acara}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabel Rekap Presensi */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 text-sm font-semibold border-b">
                <th className="p-3.5">Nama Generus</th>
                <th className="p-3.5">Acara</th>
                <th className="p-3.5">Kelompok</th>
                <th className="p-3.5">Waktu</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-center">Aksi Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center p-6 text-slate-500">Memuat data presensi...</td>
                </tr>
              ) : filteredPresensi.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-6 text-slate-500">Belum ada data presensi.</td>
                </tr>
              ) : (
                filteredPresensi.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-3.5 font-medium text-slate-800">{item.generus?.nama || '-'}</td>
                    <td className="p-3.5 text-slate-600">{item.acara?.nama_acara || '-'}</td>
                    <td className="p-3.5 text-slate-600">{item.generus?.kelompok || '-'}</td>
                    <td className="p-3.5 text-slate-500 text-xs">
                      {new Date(item.waktu_scanned || item.created_at).toLocaleString('id-ID')}
                    </td>
                    <td className="p-3.5">
                      {editingId === item.id ? (
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                          className="p-1 border rounded text-xs outline-none"
                        >
                          <option value="hadir">Hadir</option>
                          <option value="izin">Izin</option>
                          <option value="sakit">Sakit</option>
                        </select>
                      ) : (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          item.status === 'hadir' ? 'bg-emerald-100 text-emerald-800' :
                          item.status === 'izin' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {item.status?.toUpperCase()}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {editingId === item.id ? (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(item.id)}
                              className="p-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1.5 bg-slate-400 text-white rounded hover:bg-slate-500"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => { setEditingId(item.id); setEditStatus(item.status); }}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}