import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { Resend } from 'resend';

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
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly mailFrom: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const provider = process.env.EMAIL_PROVIDER?.trim().toLowerCase();

    if (provider && provider !== 'resend') {
      this.logger.warn(`[EMAIL] EMAIL_PROVIDER=${provider} ignored. Resend is the only provider.`);
    }

    this.resend = apiKey ? new Resend(apiKey) : null;
    this.mailFrom = process.env.MAIL_FROM?.trim() || 'PCSystemStore <onboarding@resend.dev>';
  }

  async sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<void> {
    const subject =
      input.flow === 'admin'
        ? 'Recuperacion de acceso administrativo - PCSystemStore'
        : 'Recuperacion de contrasena - PCSystemStore';

    await this.sendMail({
      to: input.to,
      subject,
      text: this.buildPasswordResetText(input),
      html: this.buildPasswordResetHtml(input),
    });
  }

  async sendGoogleWelcomeSetPasswordEmail(input: AccountLinkEmailInput): Promise<void> {
    await this.sendMail({
      to: input.to,
      subject: 'Bienvenido a PCSystemStore',
      text: this.buildGoogleWelcomeText(input),
      html: this.buildGoogleWelcomeHtml(input),
    });
  }

  async sendEmailVerificationEmail(input: AccountLinkEmailInput): Promise<void> {
    await this.sendMail({
      to: input.to,
      subject: 'Verifica tu correo - PCSystemStore',
      text: this.buildEmailVerificationText(input),
      html: this.buildEmailVerificationHtml(input),
    });
  }

  async sendMail(params: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<void> {
    if (!this.resend) {
      this.logger.error('[EMAIL] RESEND_API_KEY is not configured.');
      throw this.createEmailUnavailableException();
    }

    try {
      const result = await this.resend.emails.send({
        from: this.mailFrom,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      });

      if (result.error) {
        this.logger.error(`[EMAIL] Resend error: ${result.error.message}`);
        throw this.createEmailUnavailableException();
      }
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      this.logger.error(
        `[EMAIL] Failed to send email with Resend: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
      throw this.createEmailUnavailableException();
    }
  }

  private createEmailUnavailableException(): ServiceUnavailableException {
    return new ServiceUnavailableException(
      'No pudimos enviar el correo en este momento. Inténtalo nuevamente más tarde.',
    );
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
