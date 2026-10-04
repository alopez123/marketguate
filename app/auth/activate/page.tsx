'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

function ActivateContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const router = useRouter()
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Activando tu cuenta...')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Token de activación no proporcionado.')
      return
    }

    fetch('/api/market-auth/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })
      .then(async (res) => {
        const data = await res.json()
        if (res.ok) {
          setStatus('success')
          setMessage('¡Cuenta activada con éxito! Redirigiendo...')
          setTimeout(() => router.push('/'), 3000)
        } else {
          setStatus('error')
          setMessage(data.error || 'El enlace de activación es inválido o ha expirado.')
        }
      })
      .catch(() => {
        setStatus('error')
        setMessage('Error de conexión con el servidor.')
      })
  }, [token, router])

  return (
    <div className="max-w-md w-full bg-[#0b101d] border border-slate-700/80 p-8 rounded-3xl shadow-2xl text-center">
      <h2 className="text-2xl font-black text-white mb-4">Activación de Cuenta</h2>
      <div className={`p-4 rounded-xl text-xs font-bold ${status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : status === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'text-cyan-400 animate-pulse'}`}>
        {message}
      </div>
    </div>
  )
}

export default function ActivatePage() {
  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4 font-sans">
      <Suspense fallback={<div className="text-cyan-400 text-xs font-mono animate-pulse">Cargando...</div>}>
        <ActivateContent />
      </Suspense>
    </div>
  )
}