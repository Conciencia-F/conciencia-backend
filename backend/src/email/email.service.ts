import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly resend: Resend;
  private readonly logger = new Logger(EmailService.name);
  private readonly from: string;
  private readonly baseUrl: string;
  private readonly overrideTo?: string;

  constructor(private readonly cfg: ConfigService) {
    const apiKey = this.cfg.get<string>('RESEND_API_KEY');
    const from = this.cfg.get<string>('EMAIL_FROM');
    if (!apiKey) throw new Error('Falta RESEND_API_KEY');
    if (!from) throw new Error('Falta EMAIL_FROM');

    this.resend = new Resend(apiKey);
    this.from = from;
    this.baseUrl = this.cfg.get<string>('EMAIL_BASE_URL') ?? 'http://localhost:3000';
    this.overrideTo = this.cfg.get<string>('EMAIL_OVERRIDE_TO') || undefined;
  }

  async sendVerificationEmail(to: string, token: string) {
    const url = new URL(`/auth/verify-email/${token}`, this.baseUrl).toString();
    const html = this.buildTemplate('Verificación de Email', url, 'Verificar Email');
    return this.sendEmail(this.resolveTo(to), 'Verificación de Email', html);
  }

  async sendPasswordResetEmail(to: string, token: string) {
    const url = new URL(`/auth/reset-password/${token}`, this.baseUrl).toString();
    const html = this.buildTemplate('Restablecimiento de Contraseña', url, 'Restablecer Contraseña');
    return this.sendEmail(this.resolveTo(to), 'Restablecimiento de Contraseña', html);
  }

  private resolveTo(to: string) {
    return this.overrideTo ?? to; // si definiste EMAIL_OVERRIDE_TO, todo llega a tu correo
  }

  private async sendEmail(to: string, subject: string, html: string) {
    const resp = await this.resend.emails.send({ from: this.from, to, subject, html }) as any;
    if (resp?.error || !resp?.data?.id) {
      this.logger.error(`Error al enviar email a ${to}: ${resp?.error?.message ?? 'respuesta inválida'}`);
      throw new Error(`EmailException: ${subject} → ${to}`);
    }
    this.logger.log(`Correo enviado a ${to} (ID: ${resp.data.id})`);
    return resp.data;
  }

  private buildTemplate(title: string, url: string, action: string) {
    return `
<div style="text-align:center;font-family:sans-serif;margin:20px;padding:20px;border-radius:20px">
  <h1 style="color:#b565e2;margin-bottom:20px">Conciencia</h1>
  <h3 style="color:#b565e2;">${title}</h3>
  <p style="margin-bottom:30px">Haz clic en el botón para continuar:</p>
  <div style="margin-bottom:30px">
    <a href="${url}" style="background-color:#7e3fbf;color:#fff;padding:12px 24px;text-decoration:none;border-radius:5px;font-weight:bold;">
      ${action}
    </a>
  </div>
  <p>Si no solicitaste esta acción, ignora este correo.</p>
  <p>- El equipo de Conciencia</p>
</div>`;
  }
}

