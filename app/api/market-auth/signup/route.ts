import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import bcrypt from 'bcrypt';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Faltan campos obligatorios.' }, { status: 400 });
    }

    // 1. Verificar si el usuario ya existe
    const { data: existingUser } = await supabaseAdmin
      .from('marketusers')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json({ error: 'El correo ya está registrado.' }, { status: 400 });
    }

    // 2. Hashear la contraseña con bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Insertar el nuevo usuario con is_active en true (activo por defecto)
    const { error: insertError } = await supabaseAdmin
      .from('marketusers')
      .insert([
        {
          email,
          password: hashedPassword,
          is_active: true // <--- Esto evita que debas activarlos manualmente
        }
      ]);

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({ 
      success: true, 
      message: '¡Registro exitoso! Ya puedes iniciar sesión.' 
    });

  } catch (error: any) {
    console.error("--- ERROR EN SIGNUP ---", error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}