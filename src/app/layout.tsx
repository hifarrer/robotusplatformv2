import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/auth-provider'
import { CreditsProvider } from '@/contexts/credits-context'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Robotus AI Platform',
  description: 'All-in-one AI platform for image and video generation',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <AuthProvider>
          <CreditsProvider>
            {children}
          </CreditsProvider>
        </AuthProvider>
      </body>
    </html>
  )
}