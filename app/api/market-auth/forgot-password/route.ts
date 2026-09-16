import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    const { data: user, error: userError } = await supabase
      .from('marketusers')
      .select('id, email')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return NextResponse.json({ success: true, message: 'Si el correo existe, se han enviado las instrucciones.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hora de vigencia

    const { error: updateError } = await supabase
      .from('marketusers')
      .update({ 
        reset_token: resetToken, 
        reset_token_expires: expiresAt 
      })
      .eq('id', user.id);

    if (updateError) throw new Error('No se pudo generar el token de recuperación.');

    // URL dinámica basada en el entorno actual
    const resetUrl = `${request.nextUrl.origin}/auth/reset-password?token=${resetToken}`;

    // Enviar correo de recuperación con Resend
    await resend.emails.send({
      from: 'MarketGuate <onboarding@resend.dev>',
      to: [email],
      subject: 'Restablece tu contraseña en MarketGuate',
      html: `
        <div style="font-family: sans-serif; background: #070b12; color: #ffffff; padding: 30px; border-radius: 20px;">
          <h2 style="color: #06b6d4;">Recuperación de Contraseña</h2>
          <p>Has solicitado restablecer tu contraseña en MarketGuate. Haz clic en el siguiente botón para continuar:</p>
          <a href="${resetUrl}" style="display: inline-block; background: #0891b2; color: white; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: bold; margin: 20px 0;">
            Restablecer Contraseña
          </a>
          <p style="font-size: 12px; color: #94a3b8;">Este enlace expirará en 1 hora. Si tú no solicitaste esto, puedes ignorar este correo.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, message: 'Correo de recuperación enviado con éxito.' });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}