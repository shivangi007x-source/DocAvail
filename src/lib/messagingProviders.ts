import fs from 'node:fs/promises';
import path from 'node:path';

export interface VerificationEmailPayload {
  toEmail: string;
  recipientName: string;
  verificationUrl: string;
  expiresMinutes: number;
}

export interface VerificationSmsPayload {
  toPhoneE164: string;
  recipientName: string;
  otp: string;
  expiresMinutes: number;
}

export interface DeliveryResult {
  delivered: boolean;
  mode: 'provider' | 'local_dev_outbox' | 'unconfigured';
  provider: string;
  error?: string;
}

export interface EmailProvider {
  sendVerificationEmail(payload: VerificationEmailPayload): Promise<DeliveryResult>;
}

export interface SmsProvider {
  sendVerificationOtp(payload: VerificationSmsPayload): Promise<DeliveryResult>;
}

function getLocalOutboxPath(): string {
  return (
    process.env.LOCAL_VERIFICATION_OUTBOX_PATH ||
    path.join(process.cwd(), '.local-verification-outbox.jsonl')
  );
}

/**
 * Only allow the local file-backed outbox when running locally outside Vercel production.
 * In deployed/public environments without credentials, providers explicitly fail with 503
 * rather than pretending delivery occurred or leaking tokens/OTPs.
 */
export function isLocalOutboxAllowed(): boolean {
  if (process.env.VERCEL === '1') return false;
  if (process.env.DISABLE_LOCAL_VERIFICATION_OUTBOX === 'true') return false;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').trim().toLowerCase();
  if (process.env.NODE_ENV !== 'production') return true;
  if (!appUrl) return true;
  return appUrl.startsWith('http://localhost') || appUrl.startsWith('http://127.0.0.1');
}

class ResendEmailProvider implements EmailProvider {
  constructor(
    private readonly apiKey: string,
    private readonly fromAddress: string
  ) {}

  async sendVerificationEmail(payload: VerificationEmailPayload): Promise<DeliveryResult> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.fromAddress,
        to: [payload.toEmail],
        subject: 'Verify your DocAvail email address',
        html: `
          <p>Hello ${payload.recipientName},</p>
          <p>Please verify your email address for DocAvail by clicking the link below (valid for ${payload.expiresMinutes} minutes):</p>
          <p><a href="${payload.verificationUrl}">${payload.verificationUrl}</a></p>
          <p>If you did not create a DocAvail account, you can safely ignore this message.</p>
        `,
      }),
    });

    if (!res.ok) {
      return {
        delivered: false,
        mode: 'provider',
        provider: 'resend',
        error: `Resend API returned HTTP ${res.status}`,
      };
    }

    return { delivered: true, mode: 'provider', provider: 'resend' };
  }
}

class TwilioSmsProvider implements SmsProvider {
  constructor(
    private readonly accountSid: string,
    private readonly authToken: string,
    private readonly fromNumber: string
  ) {}

  async sendVerificationOtp(payload: VerificationSmsPayload): Promise<DeliveryResult> {
    const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(
      this.accountSid
    )}/Messages.json`;
    const body = new URLSearchParams({
      To: payload.toPhoneE164,
      From: this.fromNumber,
      Body: `Your DocAvail verification code is ${payload.otp}. It expires in ${payload.expiresMinutes} minutes. Do not share this code.`,
    });

    const authHeader = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (!res.ok) {
      return {
        delivered: false,
        mode: 'provider',
        provider: 'twilio',
        error: `Twilio API returned HTTP ${res.status}`,
      };
    }

    return { delivered: true, mode: 'provider', provider: 'twilio' };
  }
}

class LocalDevOutboxEmailProvider implements EmailProvider {
  async sendVerificationEmail(payload: VerificationEmailPayload): Promise<DeliveryResult> {
    const record = {
      channel: 'EMAIL',
      toEmail: payload.toEmail,
      recipientName: payload.recipientName,
      verificationUrl: payload.verificationUrl,
      expiresMinutes: payload.expiresMinutes,
      createdAt: new Date().toISOString(),
    };
    await fs.appendFile(getLocalOutboxPath(), `${JSON.stringify(record)}\n`, 'utf8');
    return { delivered: true, mode: 'local_dev_outbox', provider: 'local_dev_outbox' };
  }
}

class LocalDevOutboxSmsProvider implements SmsProvider {
  async sendVerificationOtp(payload: VerificationSmsPayload): Promise<DeliveryResult> {
    const record = {
      channel: 'SMS',
      toPhoneE164: payload.toPhoneE164,
      recipientName: payload.recipientName,
      otp: payload.otp,
      expiresMinutes: payload.expiresMinutes,
      createdAt: new Date().toISOString(),
    };
    await fs.appendFile(getLocalOutboxPath(), `${JSON.stringify(record)}\n`, 'utf8');
    return { delivered: true, mode: 'local_dev_outbox', provider: 'local_dev_outbox' };
  }
}

class UnconfiguredEmailProvider implements EmailProvider {
  async sendVerificationEmail(): Promise<DeliveryResult> {
    return {
      delivered: false,
      mode: 'unconfigured',
      provider: 'none',
      error:
        'Email verification delivery provider is not configured. Set RESEND_API_KEY and EMAIL_FROM in environment variables.',
    };
  }
}

class UnconfiguredSmsProvider implements SmsProvider {
  async sendVerificationOtp(): Promise<DeliveryResult> {
    return {
      delivered: false,
      mode: 'unconfigured',
      provider: 'none',
      error:
        'SMS OTP delivery provider is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER in environment variables.',
    };
  }
}

export function getEmailProvider(): EmailProvider {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (apiKey && from) {
    return new ResendEmailProvider(apiKey, from);
  }
  if (isLocalOutboxAllowed()) {
    return new LocalDevOutboxEmailProvider();
  }
  return new UnconfiguredEmailProvider();
}

export function getSmsProvider(): SmsProvider {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_FROM_NUMBER?.trim();
  if (sid && token && from) {
    return new TwilioSmsProvider(sid, token, from);
  }
  if (isLocalOutboxAllowed()) {
    return new LocalDevOutboxSmsProvider();
  }
  return new UnconfiguredSmsProvider();
}
