import type { Role } from '../db.js';

export interface AuthAccount { id: number; username: string; role: Role; expiresAt?: number }
export interface FixtureMail { account: string; token: string; expiresAt: number }
/** Auth-lifecycle opt-in only. Never expose this object through observations or evidence. */
export interface AuthLifecycleOptions {
  mode: 'multi-step' | 'totp' | 'magic-link';
  tenant: string;
  ttlMs?: number;
  challengeTtlMs?: number;
  now?: () => number;
  totpSecret?: Buffer;
  mailSink?: FixtureMail[];
  invalidSession?: boolean;
  changedRole?: Role;
  /** Deliberately authenticate a different fixture account while displaying the requested name. */
  wrongUser?: AuthAccount;
}
