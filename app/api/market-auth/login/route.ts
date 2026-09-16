import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import bcrypt from 'bcrypt';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Faltan campos obligatorios.' }, { status: 400 });
    }

    // 1. Buscar al usuario en la tabla marketusers
    const { data: user, error } = await supabaseAdmin
      .from('marketusers')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'Credenciales inválidas o usuario no registrado.' }, { status: 400 });
    }

    // 2. Verificar si la cuenta ya fue activada
    if (!user.is_active) {
      return NextResponse.json({ error: 'Tu cuenta aún no está activa. Revisa tu correo.' }, { status: 400 });
    }

    // 3. Comparar la contraseña con bcrypt
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return NextResponse.json({ error: 'Contraseña incorrecta.' }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      message: '¡Bienvenido a MarketGuate!',
      user: { email: user.email } 
    });

  } catch (error: any) {
    console.error("--- ERROR EN LOGIN ---", error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}