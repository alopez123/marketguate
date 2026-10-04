import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Cliente de Supabase con privilegios de servidor (bypassea RLS de forma segura)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: 'El token y la nueva contraseña son requeridos.' }, { status: 400 });
    }

    // 1. Buscar al usuario que tenga este token y cuyo tiempo de expiración sea mayor al actual
    const { data: user, error: userError } = await supabaseAdmin
      .from('marketusers')
      .select('id, email, reset_token_expires')
      .eq('reset_token', token)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'El enlace de recuperación es inválido.' }, { status: 400 });
    }

    // 2. Validar si el token ya expiró
    if (user.reset_token_expires && new Date(user.reset_token_expires) < new Date()) {
      return NextResponse.json({ error: 'El enlace de recuperación ha expirado.' }, { status: 400 });
    }

    // 3. Actualizar la contraseña y limpiar los campos del token para que no se puedan reutilizar
    const { error: updateError } = await supabaseAdmin
      .from('marketusers')
      .update({
        password: password, // O puedes aplicar encriptación con bcrypt si tus contraseñas van hasheadas
        reset_token: null,
        reset_token_expires: null,
      })
      .eq('id', user.id);

    if (updateError) {
      throw new Error('No se pudo actualizar la contraseña en la base de datos.');
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Contraseña actualizada exitosamente.' 
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error interno del servidor.' }, { status: 500 });
  }
}