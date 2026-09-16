import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Faltan campos obligatorios.' }, { status: 400 });
    }

    // 1. Buscar si el usuario ya existe en la base de datos
    const { data: existingUser } = await supabaseAdmin
      .from('marketusers')
      .select('id, is_active')
      .eq('email', email)
      .single();

    let activationToken = crypto.randomBytes(32).toString('hex');

    if (existingUser) {
      if (existingUser.is_active) {
        return NextResponse.json({ error: 'Este correo ya está registrado y activo. Inicia sesión.' }, { status: 400 });
      }

      // Si existe pero NO está activo, actualizamos su contraseña y generamos un nuevo token de reenvío
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const { error: updateError } = await supabaseAdmin
        .from('marketusers')
        .update({ 
          password: hashedPassword,
          activation_token: activationToken 
        })
        .eq('id', existingUser.id);

      if (updateError) throw new Error('No se pudo actualizar el token de activación.');

    } else {
      // Si no existe, creamos el usuario inactivo por defecto
      const hashedPassword = await bcrypt.hash(password, 10);

      const { error: insertError } = await supabaseAdmin
        .from('marketusers')
        .insert([{ 
          email, 
          password: hashedPassword, 
          is_active: false, 
          activation_token: activationToken 
        }]);

      if (insertError) throw new Error(insertError.message);
    }

    // 2. Crear la URL de activación dinámica basada en el entorno actual
    const activationUrl = `${request.nextUrl.origin}/auth/activate?token=${activationToken}`;

    // 3. Enviar el correo electrónico mediante Resend
    await resend.emails.send({
      from: 'MarketGuate <onboarding@resend.dev>',
      to: [email],
      subject: 'Activa tu cuenta en MarketGuate',
      html: `
        <div style="font-family: sans-serif; background: #070b12; color: #ffffff; padding: 30px; border-radius: 20px;">
          <h2 style="color: #06b6d4;">¡Bienvenido a MarketGuate!</h2>
          <p>Estás a un paso de acceder a todas las sucursales y productos. Haz clic en el siguiente botón para confirmar tu correo:</p>
          <a href="${activationUrl}" style="display: inline-block; background: #0891b2; color: white; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: bold; margin: 20px 0;">
            Activar mi Cuenta
          </a>
          <p style="font-size: 12px; color: #94a3b8;">Si tú no creaste esta cuenta, puedes ignorar este mensaje.</p>
        </div>
      `,
    });

    return NextResponse.json({ 
      success: true, 
      message: '¡Correo de activación enviado con éxito! Revisa tu bandeja.' 
    });

  } catch (error: any) {
    console.error("--- ERROR EN SIGNUP ---", error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}