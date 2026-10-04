'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const router = useRouter()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setStatus('error')
      setMessage('Las contraseñas no coinciden.')
      return
    }

    setStatus('loading')
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      })
      const data = await res.json()

      if (res.ok) {
        setStatus('success')
        setMessage('Contraseña actualizada con éxito. Redirigiendo...')
        setTimeout(() => router.push('/login'), 2000)
      } else {
        setStatus('error')
        setMessage(data.error || 'El enlace es inválido o ha expirado.')
      }
    } catch (err) {
      setStatus('error')
      setMessage('Error de conexión con el servidor.')
    }
  }

  return (
    <div className="max-w-md w-full bg-[#0b101d] border border-slate-700/80 p-8 rounded-3xl shadow-2xl backdrop-blur-xl">
      <h2 className="text-2xl font-black text-white mb-2 text-center">Nueva Contraseña</h2>
      <p className="text-slate-400 text-xs text-center mb-6">Ingresa tu nueva contraseña para tu cuenta de MarketGuate.</p>

      {status === 'success' ? (
        <div className="bg-emerald-500/10 text-emerald-400 p-4 rounded-xl text-center text-xs font-bold border border-emerald-500/30">
          {message}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-bold mb-1.5">Nueva Contraseña</label>
            <input 
              type="password" 
              required 
              placeholder="••••••••" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              className="w-full bg-[#030712] border border-slate-700 rounded-xl px-4 py-3.5 text-white outline-none focus:border-cyan-500 transition-colors" 
            />
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1.5">Confirmar Contraseña</label>
            <input 
              type="password" 
              required 
              placeholder="••••••••" 
              value={confirmPassword} 
              onChange={e => setConfirmPassword(e.target.value)} 
              className="w-full bg-[#030712] border border-slate-700 rounded-xl px-4 py-3.5 text-white outline-none focus:border-cyan-500 transition-colors" 
            />
          </div>

          {status === 'error' && (
            <div className="text-red-400 text-center font-bold">{message}</div>
          )}

          <button 
            type="submit" 
            disabled={status === 'loading'}
            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-extrabold py-3.5 rounded-xl uppercase tracking-wider shadow-lg shadow-cyan-600/30 transition-all disabled:opacity-50"
          >
            {status === 'loading' ? 'Actualizando...' : 'Guardar Nueva Contraseña'}
          </button>
        </form>
      )}
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4 text-slate-100 font-sans">
      <Suspense fallback={<div className="text-cyan-400 text-xs font-mono animate-pulse">Cargando formulario...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}