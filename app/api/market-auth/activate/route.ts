import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Token de activación no proporcionado.' }, { status: 400 });
    }

    // 1. Buscar usuario por el token de activación
    const { data: user, error: userError } = await supabaseAdmin
      .from('marketusers')
      .select('id, activation_token_expires')
      .eq('activation_token', token)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'El enlace de activación es inválido.' }, { status: 400 });
    }

    if (user.activation_token_expires && new Date(user.activation_token_expires) < new Date()) {
      return NextResponse.json({ error: 'El enlace de activación ha expirado.' }, { status: 400 });
    }

    // 2. Activar usuario y limpiar tokens
    const { error: updateError } = await supabaseAdmin
      .from('marketusers')
      .update({
        is_active: true,
        activation_token: null,
        activation_token_expires: null,
      })
      .eq('id', user.id);

    if (updateError) {
      throw new Error('No se pudo activar la cuenta.');
    }

    return NextResponse.json({ success: true, message: '¡Cuenta activada exitosamente!' });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error interno del servidor.' }, { status: 500 });
  }
}