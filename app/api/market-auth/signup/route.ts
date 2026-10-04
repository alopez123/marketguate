import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

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

    // 3. Generar token de activación y expiración (24 horas)
    const activationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // 4. Insertar el nuevo usuario con is_active en false y sus tokens
    const { error: insertError } = await supabaseAdmin
      .from('marketusers')
      .insert([
        {
          email,
          password: hashedPassword,
          is_active: false, // Inactivo hasta que confirme su correo
          activation_token: activationToken,
          activation_token_expires: tokenExpires,
        }
      ]);

    if (insertError) {
      throw insertError;
    }

    // 5. Enviar correo de activación con Resend
    const activationUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://marketguate.net'}/auth/activate?token=${activationToken}`;

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'MarketGuate <no-reply@marketguate.net>',
        to: [email],
        subject: 'Activa tu cuenta en MarketGuate',
        html: `
          <div style="font-family: Arial, sans-serif; background-color: #030712; color: #f3f4f6; padding: 30px; border-radius: 12px;">
            <h2 style="color: #38bdf8; text-align: center;">¡Bienvenido a MarketGuate!</h2>
            <p>Gracias por registrarte. Para activar tu cuenta y poder iniciar sesión, por favor confirma tu correo electrónico haciendo clic en el siguiente botón:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${activationUrl}" style="background: linear-gradient(to right, #0284c7, #2563eb); color: #ffffff; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block;">Activar Mi Cuenta</a>
            </div>
            <p style="font-size: 12px; color: #9ca3af; text-align: center;">Si no creaste esta cuenta, puedes ignorar este mensaje.</p>
          </div>
        `,
      }),
    });

    if (!resendResponse.ok) {
      console.error("Error al enviar correo con Resend");
    }

    return NextResponse.json({ 
      success: true, 
      message: '¡Registro exitoso! Por favor verifica tu correo electrónico para activar tu cuenta antes de iniciar sesión.' 
    });

  } catch (error: any) {
    console.error("--- ERROR EN SIGNUP ---", error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}