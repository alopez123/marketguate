import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'El correo electrónico es requerido.' }, { status: 400 });
    }

    // 1. Verificar si el usuario existe en tu tabla marketusers
    const { data: user, error: userError } = await supabase
      .from('marketusers')
      .select('id, email')
      .eq('email', email)
      .single();

    if (userError || !user) {
      // Por seguridad devolvemos éxito para no filtrar qué correos existen
      return NextResponse.json({ 
        success: true, 
        message: 'Si el correo está registrado, recibirás las instrucciones.' 
      });
    }

    // 2. Generar token único y expiración (1 hora)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000).toISOString();

    // 3. Guardar el token en la base de datos
    const { error: updateError } = await supabase
      .from('marketusers')
      .update({
        reset_token: token,
        reset_token_expires: expiresAt,
      })
      .eq('id', user.id);

    if (updateError) {
      throw new Error('No se pudo generar el token de recuperación.');
    }

    // 4. Construir el enlace de restablecimiento
    const resetLink = `${request.nextUrl.origin}/auth/reset-password?token=${token}`;

    // 5. Enviar el correo usando Resend con tu API Key del .env.local
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
       from: 'MarketGuate <soporte@marketguate.net>', // O tu dominio verificado en Resend
        to: [user.email],
        subject: 'Recuperación de Contraseña - MarketGuate',
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #00acc1;">MarketGuate - Recuperación de Contraseña</h2>
            <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente botón para continuar:</p>
            <a href="${resetLink}" style="display: inline-block; background: #00acc1; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">Restablecer Contraseña</a>
            <p style="font-size: 12px; color: #777;">Si no solicitaste este cambio, puedes ignorar este mensaje.</p>
          </div>
        `
      })
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      throw new Error(resendData.message || 'Error al enviar el correo con Resend.');
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Correo de recuperación enviado exitosamente.' 
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error interno del servidor.' }, { status: 500 });
  }
}