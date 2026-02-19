import { redirect } from 'next/navigation'

export default function RootPage() {
  // En el futuro esto verificará la sesión
  redirect('/login')
}
