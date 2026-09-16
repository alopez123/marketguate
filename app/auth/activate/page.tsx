export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase-admin';

export default async function ActivatePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // Extraemos el token de forma segura
  const token = typeof searchParams.token === 'string' ? searchParams.token : undefined;

  let message = '';
  let isSuccess = false;

  if (!token) {
    message = 'Token de activación no proporcionado o inválido.';
  } else {
    // 1. Buscar el usuario que tenga este token de activación
    const { data: user, error: findError } = await supabaseAdmin
      .from('marketusers')
      .select('id, is_active')
      .eq('activation_token', token)
      .single();

    if (findError || !user) {
      message = 'El enlace de activación es inválido o ya ha expirado.';
    } else if (user.is_active) {
      isSuccess = true;
      message = 'Tu cuenta ya había sido activada anteriormente. Puedes iniciar sesión.';
    } else {
      // 2. Activar la cuenta y limpiar el token
      const { error: updateError } = await supabaseAdmin
        .from('marketusers')
        .update({ 
          is_active: true, 
          activation_token: null 
        })
        .eq('id', user.id);

      if (updateError) {
        message = 'Ocurrió un error al activar la cuenta. Inténtalo de nuevo.';
      } else {
        isSuccess = true;
        message = '¡Tu cuenta ha sido activada exitosamente! Ya puedes iniciar sesión.';
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#070b12] text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#111827] border border-gray-800 rounded-2xl p-8 shadow-2xl text-center">
        <h1 className="text-2xl font-bold mb-4 text-[#06b6d4]">Activación de Cuenta</h1>
        
        <p className={`text-sm mb-6 ${isSuccess ? 'text-green-400' : 'text-red-400'}`}>
          {message}
        </p>

        <Link
          href="/"
          className="inline-block w-full bg-[#0891b2] hover:bg-[#0e7490] text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 text-center no-underline"
        >
          Ir al Inicio / Iniciar Sesión
        </Link>
      </div>
    </div>
  );
}