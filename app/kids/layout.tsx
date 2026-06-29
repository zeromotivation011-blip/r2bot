import KidsShell from './KidsShell'

export const runtime = 'nodejs'

export default function KidsLayout({ children }: { children: React.ReactNode }) {
  return <KidsShell>{children}</KidsShell>
}
