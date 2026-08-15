import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Presensi Generus',
  description: 'Sistem Pengelolaan Kehadiran & Data Generus',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" className="h-full bg-slate-50">
      <body className={`${inter.className} h-full antialiased text-slate-900 bg-slate-50 selection:bg-blue-100 selection:text-blue-700`}>
        {children}
      </body>
    </html>
  )
}