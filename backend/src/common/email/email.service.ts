import { Injectable, InternalServerErrorException } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';

type PasswordResetEmailInput = {
  to: string;
  name: string;
  resetLink: string;
  flow: 'client' | 'admin';
};

type AccountLinkEmailInput = {
  to: string;
  name: string;
  link: string;
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

  async sendGoogleWelcomeSetPasswordEmail(input: AccountLinkEmailInput): Promise<void> {
    const transporter = this.getTransporter();

    await transporter.sendMail({
      from: this.getMailFrom(),
      to: input.to,
      subject: 'Bienvenido a PCSystemStore',
      text: this.buildGoogleWelcomeText(input),
      html: this.buildGoogleWelcomeHtml(input),
    });
  }

  async sendEmailVerificationEmail(input: AccountLinkEmailInput): Promise<void> {
    const transporter = this.getTransporter();

    await transporter.sendMail({
      from: this.getMailFrom(),
      to: input.to,
      subject: 'Verifica tu correo - PCSystemStore',
      text: this.buildEmailVerificationText(input),
      html: this.buildEmailVerificationHtml(input),
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

  private buildGoogleWelcomeText(input: AccountLinkEmailInput): string {
    return [
      `Hola ${input.name},`,
      '',
      'Tu cuenta en PCSystemStore fue creada con Google.',
      'Si tambien deseas ingresar con correo y contrasena, crea tu contrasena desde este enlace:',
      input.link,
      '',
      'Este enlace expira en 30 minutos.',
      'PCSystemStore',
    ].join('\n');
  }

  private buildGoogleWelcomeHtml(input: AccountLinkEmailInput): string {
    return this.buildActionEmailHtml({
      title: 'Bienvenido a PCSystemStore',
      greeting: `Hola ${input.name},`,
      body: 'Tu cuenta fue creada con Google. Si tambien deseas ingresar con correo y contrasena, crea tu contrasena desde este enlace.',
      buttonLabel: 'Crear contrasena',
      link: input.link,
    });
  }

  private buildEmailVerificationText(input: AccountLinkEmailInput): string {
    return [
      `Hola ${input.name},`,
      '',
      'Verifica tu correo para activar completamente tu cuenta en PCSystemStore:',
      input.link,
      '',
      'Este enlace expira en 30 minutos.',
      'PCSystemStore',
    ].join('\n');
  }

  private buildEmailVerificationHtml(input: AccountLinkEmailInput): string {
    return this.buildActionEmailHtml({
      title: 'Verifica tu correo',
      greeting: `Hola ${input.name},`,
      body: 'Verifica tu correo para activar completamente tu cuenta en PCSystemStore.',
      buttonLabel: 'Verificar correo',
      link: input.link,
    });
  }

  private buildActionEmailHtml(input: {
    title: string;
    greeting: string;
    body: string;
    buttonLabel: string;
    link: string;
  }): string {
    return `
      <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
        <h1 style="font-size: 20px;">${this.escapeHtml(input.title)}</h1>
        <p>${this.escapeHtml(input.greeting)}</p>
        <p>${this.escapeHtml(input.body)}</p>
        <p>
          <a href="${this.escapeHtml(input.link)}" style="display: inline-block; padding: 12px 18px; background: #00d1ff; color: #111827; font-weight: 700; text-decoration: none; border-radius: 10px;">
            ${this.escapeHtml(input.buttonLabel)}
          </a>
        </p>
        <p>Este enlace expira en 30 minutos.</p>
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
