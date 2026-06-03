import { redirect } from 'next/navigation'

// Auth disabled — redirect to main app
export default function LoginPage() {
  redirect('/')
}
