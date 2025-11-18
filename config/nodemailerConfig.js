import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Configurar transporte de Zoho
const transporter = nodemailer.createTransport({
  host: process.env.ZOHO_HOST || 'smtp.zoho.com',
  port: parseInt(process.env.ZOHO_PORT) || 465,
  secure: true, // true para puerto 465, false para otros puertos
  auth: {
    user: process.env.ZOHO_EMAIL,
    pass: process.env.ZOHO_PASSWORD
  }
});

/**
 * Enviar email con código de verificación
 */
export const enviarCodigoVerificacion = async (email, codigo) => {
  try {
    const mailOptions = {
      from: process.env.ZOHO_EMAIL,
      to: email,
      subject: 'Código de verificación para eliminar tu cuenta',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Solicitud de eliminación de cuenta</h2>
          <p>Hola,</p>
          <p>Has solicitado eliminar tu cuenta. Para continuar con el proceso, ingresa el siguiente código:</p>
          <div style="background-color: #f0f0f0; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px;">
            <h1 style="color: #333; letter-spacing: 5px; font-size: 32px; margin: 0;">${codigo}</h1>
          </div>
          <p><strong>Este código es válido por 30 minutos.</strong></p>
          <p style="color: #666; font-size: 12px;">Si no solicitaste eliminar tu cuenta, ignora este mensaje.</p>
          <hr>
          <p style="color: #999; font-size: 11px;">Este es un mensaje automatizado, por favor no respondas a este correo.</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email enviado:', info.response);
    return {
      success: true,
      message: 'Código enviado al correo'
    };
  } catch (error) {
    console.error('Error al enviar email:', error);
    throw new Error('No se pudo enviar el correo: ' + error.message);
  }
};

/**
 * Verificar conexión con Zoho
 */
export const verificarConexion = async () => {
  try {
    await transporter.verify();
    console.log('✓ Conexión con Zoho Mail establecida correctamente');
    return true;
  } catch (error) {
    console.error('✗ Error de conexión con Zoho Mail:', error.message);
    return false;
  }
};

export default transporter;
