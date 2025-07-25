// e.g. components/ConnectGoogle.tsx
'use client'
import { signIn, useSession } from 'next-auth/react'

export function ConnectGoogle() {
  const { data: session, status } = useSession()

  if (status === 'loading') return <p>Loading…</p>
  if (status === 'unauthenticated') {
    return (
      <button
        onClick={() => signIn('google', { callbackUrl: '/' })}
        className="btn"
      >
        Connect Google Calendar
      </button>
    )
  }

  return <p>Connected as {session.user?.email}</p>
}
