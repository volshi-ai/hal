/**
 * MOCK adapter — labeled as such per the build rules.
 * Logs the email instead of sending it. Swap with a real
 * EmailContextSource for production use.
 */

export interface EmailContext {
  to: string;
  subject: string;
  body: string;
}

export class EmailAdapter {
  async send(email: EmailContext): Promise<boolean> {
    console.log(`[MOCK EmailAdapter] to=${email.to} subject=${email.subject}`);
    return true;
  }
}
