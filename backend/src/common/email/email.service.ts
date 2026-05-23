import { Injectable, InternalServerErrorException } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';

type PasswordResetEmailInput = {
  to: string;
  name: string;
  resetLink: string;
  flow: 'client' | 'admin';
};

@Injectable()
export class EmailService {
  private transporter?: Transporter;

  async sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<void> {
    const transporter = this.getTransporter();
    const subject =
      input.flow === 'admin'
        ? 'Recuperacion de acceso administrativo - PCSystemStore'
        : 'Recuperacion de contrasena - PCSystemStore';

    await transporter.sendMail({
      from: this.getMailFrom(),
      to: input.to,
      subject,
      text: this.buildPasswordResetText(input),
      html: this.buildPasswordResetHtml(input),
    });
  }

  private getTransporter(): Transporter {
    if (this.transporter) {
      return this.transporter;
    }

    const host = process.env.SMTP_HOST?.trim();
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass || !Number.isFinite(port)) {
      throw new InternalServerErrorException('SMTP no esta configurado en el backend.');
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user, pass },
    });

    return this.transporter;
  }

  private getMailFrom(): string {
    return process.env.MAIL_FROM?.trim() || 'PCSystemStore <no-reply@pcsystemstore.com>';
  }

  private buildPasswordResetText(input: PasswordResetEmailInput): string {
    return [
      `Hola ${input.name},`,
      '',
      'Recibimos una solicitud para restablecer tu contrasena.',
      'Este enlace expira en 30 minutos:',
      input.resetLink,
      '',
      'Si no solicitaste este cambio, ignora este correo.',
      'PCSystemStore',
    ].join('\n');
  }

  private buildPasswordResetHtml(input: PasswordResetEmailInput): string {
    return `
      <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
        <h1 style="font-size: 20px;">Restablece tu contrasena</h1>
        <p>Hola ${this.escapeHtml(input.name)},</p>
        <p>Recibimos una solicitud para restablecer tu contrasena.</p>
        <p>
          <a href="${this.escapeHtml(input.resetLink)}" style="display: inline-block; padding: 12px 18px; background: #00d1ff; color: #111827; font-weight: 700; text-decoration: none; border-radius: 10px;">
            Cambiar contrasena
          </a>
        </p>
        <p>Este enlace expira en 30 minutos.</p>
        <p>Si no solicitaste este cambio, ignora este correo.</p>
      </div>
    `;
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
}
