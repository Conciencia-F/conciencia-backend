import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend: Resend;
  private readonly logger = new Logger(EmailService.name);
  private readonly from: string;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY!);

    if (!process.env.EMAIL_FROM) {
      throw new Error('Falta la variable de entorno EMAIL_FROM');
    }

    this.from = process.env.EMAIL_FROM;
  }

  async sendVerificationEmail(to: string, token: string) {
    const verifyUrl = `http://localhost:3000/verify-email/${token}`;
    const html = this.buildTemplate(
      'Verificación de Email',
      verifyUrl,
      'Verificar Email',
    );

    return this.sendEmail(to, 'Verificación de Email', html);
  }

  async sendPasswordResetEmail(to: string, token: string) {
    const resetUrl = `http://localhost:3000/reset-password/${token}`;
    const html = this.buildTemplate(
      'Restablecimiento de Contraseña',
      resetUrl,
      'Restablecer Contraseña',
    );

    return this.sendEmail(to, 'Restablecimiento de Contraseña', html);
  }

  private async sendEmail(to: string, subject: string, html: string) {
    try {
      const { data, error } = await this.resend.emails.send({
        from: this.from,
        to,
        subject,
        html,
      });

      if (error) {
        this.logger.error(`Error al enviar email a ${to}: ${error.message}`);
        throw new Error('No se pudo enviar el correo');
      }

      this.logger.log(`Correo enviado a ${to}`);
      return data;
    } catch (err) {
      this.logger.error(err.message);
      throw err;
    }
  }

  private buildTemplate(title: string, url: string, action: string): string {
    return `
<div style="text-align: center; font-family:sans-serif; margin:20px;padding:20px; border-radius:20px ">
  <h1 style="color: #b565e2;margin-bottom: 20px">Journal Manager</h1>
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
  <p>- El equipo de Journal Manager</p>
</div>`;
  }
}
