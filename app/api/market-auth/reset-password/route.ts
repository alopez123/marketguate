import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcrypt';

export async function POST(request: NextRequest) {
  try {
    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json({ error: 'Faltan datos requeridos.' }, { status: 400 });
    }

    const { data: user, error: userError } = await supabase
      .from('marketusers')
      .select('id, reset_token_expires')
      .eq('reset_token', token)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'Token inválido o expirado.' }, { status: 400 });
    }

    const now = new Date();
    if (user.reset_token_expires && new Date(user.reset_token_expires) < now) {
      return NextResponse.json({ error: 'El enlace de recuperación ha expirado.' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const { error: updateError } = await supabase
      .from('marketusers')
      .update({ 
        password: hashedPassword, 
        reset_token: null, 
        reset_token_expires: null 
      })
      .eq('id', user.id);

    if (updateError) throw new Error('Error al actualizar la contraseña.');

    return NextResponse.json({ success: true, message: 'Contraseña actualizada exitosamente.' });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}