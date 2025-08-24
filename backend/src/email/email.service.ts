import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { EmailException } from './email.exceptions';

@Injectable()
export class EmailService {
  private readonly resend: Resend;
  private readonly logger = new Logger(EmailService.name);
  private readonly from: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;

    if (!apiKey) {
      this.logger.error('Falta la variable de entorno RESEND_API_KEY');
      throw new Error('Falta la variable de entorno RESEND_API_KEY');
    }
    if (!from) {
      this.logger.error('Falta la variable de entorno EMAIL_FROM');
      throw new Error('Falta la variable de entorno EMAIL_FROM');
    }

    this.resend = new Resend(apiKey);
    this.from = from;
  }

  async sendVerificationEmail(to: string, token: string) {
    const verifyUrl = `http://localhost:3000/auth/verify-email/${token}`;
    const html = this.buildTemplate(
      'Verificación de Email',
      verifyUrl,
      'Verificar Email',
    );
    return this.sendEmail(to, 'Verificación de Email', html);
  }

  async sendPasswordResetEmail(to: string, token: string) {
    const resetUrl = `http://localhost:3000/auth/reset-password/${token}`;
    const html = this.buildTemplate(
      'Restablecimiento de Contraseña',
      resetUrl,
      'Restablecer Contraseña',
    );
    return this.sendEmail(to, 'Restablecimiento de Contraseña', html);
  }

  private async sendEmail(to: string, subject: string, html: string) {
    try {
      const response = (await this.resend.emails.send({
        from: this.from,
        to,
        subject,
        html,
      })) as { data?: { id?: string }; error?: any };

      this.logger.debug(
        `Respuesta completa de Resend: ${JSON.stringify(response)}`,
      );

      if (response?.error) {
        this.logger.error(
          `Error al enviar email a ${to}: ${response.error.message || 'Error desconocido'}`,
        );
      }

      if (!response?.data?.id) {
        this.logger.error(
          `Error al enviar email a ${to}: Respuesta inválida de la API de correo`,
        );
        throw new EmailException(subject, to);
      }

      this.logger.log(`Correo enviado a ${to} (ID: ${response.data.id})`);
      return response.data;
    } catch (err) {
      this.logger.error(`Excepción al enviar email a ${to}: ${err.message}`);
      if (err instanceof EmailException) throw err;
      throw new EmailException(subject, to, err);
    }
  }

  private buildTemplate(title: string, url: string, action: string): string {
    return `
<div style="text-align: center; font-family:sans-serif; margin:20px;padding:20px; border-radius:20px ">
  <h1 style="color: #b565e2;margin-bottom: 20px">Conciencia</h1>
  <h3 style="color: #b565e2;">${title}</h3>
  <p style="margin-bottom:30px">Haz clic en el botón para continuar:</p>
  <div style="margin-bottom:30px">
    <a href="${url}" style="
        background-color: #7e3fbf;
        color: #fff;
        padding: 12px 24px;
        text-decoration: none;
        border-radius: 5px;
        font-weight: bold;">${action}</a>
  </div>
  <p>Si no solicitaste esta acción, ignora este correo.</p>
  <p>- El equipo de Conciencia</p>
</div>`;
  }
}
