import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FlowDAW — Professional Audio Studio',
  description: 'Browser-based DAW with AI stem splitting',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
