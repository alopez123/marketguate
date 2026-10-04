import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: 'El token y la nueva contraseña son requeridos.' }, { status: 400 });
    }

    // Llamada segura a la función RPC en Supabase (bypassea RLS de forma controlada)
    const { data: success, error } = await supabase.rpc('reset_market_user_password', {
      p_token: token,
      p_new_password: password // (Nota: Si guardas la contraseña con hasheo bcrypt, puedes hashearla aquí antes de enviarla)
    });

    if (error || !success) {
      return NextResponse.json({ error: 'El enlace de recuperación es inválido o ha expirado.' }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Contraseña actualizada exitosamente.' 
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error interno del servidor.' }, { status: 500 });
  }
}