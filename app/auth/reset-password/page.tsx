'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const router = useRouter()

  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!token) {
      setError('Token de recuperación no válido o ausente.')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const res = await fetch('/api/market-auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al actualizar la contraseña.')

      setMessage('¡Contraseña actualizada con éxito! Redirigiendo al inicio...')
      setTimeout(() => {
        router.push('/') // Te manda de regreso al marketplace principal
      }, 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#070b12] text-white flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-slate-700 w-full max-w-md rounded-3xl p-8 shadow-2xl space-y-6">
        
        <div className="text-center space-y-2">
          <h1 className="text-xl font-black text-white tracking-wider">
            MARKET<span className="text-cyan-500">GUATE</span>
          </h1>
          <h2 className="text-lg font-bold text-slate-200">Restablecer Contraseña</h2>
          <p className="text-xs text-slate-400">Ingresa tu nueva contraseña segura.</p>
        </div>

        {message && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-xl text-xs text-center font-bold">
            {message}
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-xs text-center font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="text-slate-300 font-semibold">Nueva Contraseña</label>
            <input 
              type="password" 
              required
              value={newPassword} 
              onChange={e => setNewPassword(e.target.value)} 
              placeholder="••••••••"
              className="w-full bg-[#070b12] border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-500" 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading || !token}
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black py-3 rounded-xl uppercase tracking-wider shadow-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Actualizando...' : 'Guardar Nueva Contraseña'}
          </button>
        </form>

      </div>
    </div>
  )
}