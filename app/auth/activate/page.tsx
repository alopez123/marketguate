'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
export const dynamic = 'force-dynamic';

export default function ActivatePage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const router = useRouter()

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setErrorMessage('Token de activación no proporcionado.')
      return
    }

    async function activateAccount() {
      try {
        // 1. Buscar al usuario con este token de activación y que esté inactivo
        const { data: user, error: findError } = await supabase
          .from('marketusers')
          .select('id, is_active')
          .eq('activation_token', token)
          .single()

        if (findError || !user) {
          throw new Error('El enlace de activación es inválido o ya expiró.')
        }

        if (user.is_active) {
          setStatus('success')
          return
        }

        // 2. Activar la cuenta y limpiar el token
        const { error: updateError } = await supabase
          .from('marketusers')
          .update({ 
            is_active: true, 
            activation_token: null 
          })
          .eq('id', user.id)

        if (updateError) throw new Error('No se pudo activar la cuenta en la base de datos.')

        setStatus('success')
      } catch (err: any) {
        setStatus('error')
        setErrorMessage(err.message)
      }
    }

    activateAccount()
  }, [token])

  return (
    <div className="min-h-screen bg-[#070b12] text-white flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-slate-700 w-full max-w-md rounded-3xl p-8 shadow-2xl text-center space-y-6">
        
        <h1 className="text-xl font-black text-white tracking-wider">
          MARKET<span className="text-cyan-500">GUATE</span>
        </h1>

        {status === 'loading' && (
          <div className="space-y-3">
            <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-slate-400">Activando tu cuenta, por favor espera...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-2xl mx-auto flex items-center justify-center text-2xl">
              ✅
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white">¡Cuenta Activada con Éxito!</h2>
              <p className="text-xs text-slate-400">Tu correo ha sido confirmado. Ya puedes iniciar sesión y explorar todas las sucursales.</p>
            </div>
            <button 
              onClick={() => router.push('/')}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black py-3 rounded-xl uppercase tracking-wider shadow-lg transition-colors text-xs"
            >
              Ir a MarketGuate
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-red-500/10 text-red-400 border border-red-500/30 rounded-2xl mx-auto flex items-center justify-center text-2xl">
              ❌
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white">Error de Activación</h2>
              <p className="text-xs text-red-400">{errorMessage}</p>
            </div>
            <button 
              onClick={() => router.push('/')}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-colors text-xs border border-slate-700"
            >
              Volver al Inicio
            </button>
          </div>
        )}

      </div>
    </div>
  )
}