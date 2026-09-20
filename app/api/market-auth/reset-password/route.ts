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

    // Por seguridad, es recomendable devolver un mensaje genérico 
    // para evitar que descubran qué correos están registrados.
    if (userError || !user) {
      return NextResponse.json({ 
        success: true, 
        message: 'Si el correo está registrado, recibirás las instrucciones.' 
      });
    }

    // 2. Generar un token criptográfico seguro y definir expiración (1 hora)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000).toISOString();

    // 3. Guardar el token en la tabla marketusers
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

    // 4. Construir el enlace que llevará al usuario a tu interfaz de cambio de contraseña
    const resetLink = `${request.nextUrl.origin}/auth/reset-password?token=${token}`;

    // 5. Enviar el correo electrónico
    // (Puedes integrar aquí tu servicio de correo favorito como Resend, Nodemailer, SendGrid, etc.)
    // Ejemplo usando un servicio de correo o registrándolo en consola para pruebas:
    console.log('--- ENLACE DE RECUPERACIÓN ---');
    console.log(resetLink);
    console.log('------------------------------');

    // TODO: Reemplaza esto con la llamada real a tu proveedor de correo (ej. Resend)
    /*
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: 'soporte@tu-dominio.com',
          to: user.email,
          subject: 'Recuperación de Contraseña - MarketGuate',
          html: `<p>Haz clic en el siguiente enlace para restablecer tu contraseña: <a href="${resetLink}">Restablecer Contraseña</a></p>`
        })
      });
    */

    return NextResponse.json({ 
      success: true, 
      message: 'Correo de recuperación enviado exitosamente.' 
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error interno del servidor.' }, { status: 500 });
  }
}