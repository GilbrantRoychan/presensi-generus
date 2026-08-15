'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { QrCode, Users, Calendar, ClipboardList, LogOut, ShieldCheck } from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const navItems = [
    { name: 'Scan QR / Manual', href: '/admin/scan', icon: QrCode },
    { name: 'Data Generus', href: '/admin/generus', icon: Users },
    { name: 'Data Acara', href: '/admin/acara', icon: Calendar },
    { name: 'Rekap Presensi (Edit)', href: '/admin/rekap-edit', icon: ClipboardList },
  ]

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header / Navbar Admin */}
      <header className="bg-slate-900 text-white shadow-md sticky top-0 z-50 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Branding Judul */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-bold text-lg tracking-wide text-slate-100">GENERUS TAMANTIRTO</h1>
                <p className="text-[10px] text-slate-400 -mt-1 tracking-wider uppercase font-semibold">Panel Admin Presensi</p>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3.5 py-2 bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white rounded-lg text-sm font-medium transition border border-red-500/20"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>

          {/* Mobile Navigation Links */}
          <div className="md:hidden flex overflow-x-auto pb-3 gap-1 pt-1 border-t border-slate-800 scrollbar-none">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs whitespace-nowrap font-medium transition ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.name}
                </Link>
              )
            })}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        Generus Tamantirto 2026
      </footer>
    </div>
  )
}