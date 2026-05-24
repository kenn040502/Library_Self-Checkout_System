// @ts-nocheck

import NextAuth, { type NextAuthOptions } from 'next-auth';
import type { Session } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import AzureADProvider from 'next-auth/providers/azure-ad';
import LinkedInProvider from 'next-auth/providers/linkedin';
import { getSupabaseServerClient } from '@/app/lib/supabase/server';
import type { DashboardRole } from '@/app/lib/auth/types';

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

const clientId =
  process.env.AZURE_AD_CLIENT_ID ?? process.env.AUTH_AZURE_AD_CLIENT_ID ?? undefined;
const clientSecret =
  process.env.AZURE_AD_CLIENT_SECRET ?? process.env.AUTH_AZURE_AD_CLIENT_SECRET ?? undefined;
const tenantId =
  process.env.AZURE_AD_TENANT_ID ?? process.env.AUTH_AZURE_AD_TENANT_ID ?? undefined;
const resolvedSecret = process.env.NEXTAUTH_SECRET ?? (isDevelopment ? 'dev-secret' : undefined);

const linkedInClientId = process.env.LINKEDIN_CLIENT_ID ?? undefined;
const linkedInClientSecret = process.env.LINKEDIN_CLIENT_SECRET ?? undefined;

if (isProduction) {
  const missing = [
    ['AZURE_AD_CLIENT_ID', clientId],
    ['AZURE_AD_CLIENT_SECRET', clientSecret],
    ['AZURE_AD_TENANT_ID', tenantId],
    ['NEXTAUTH_SECRET', resolvedSecret],
  ].filter(([, value]) => !value);

  if (missing.length > 0) {
    console.error(
      `Missing required environment variables for Azure AD authentication: ${missing
        .map(([key]) => key)
        .join(', ')}.`,
    );
  }
}

const toDashboardRole = (value: unknown): DashboardRole => {
  if (typeof value !== 'string') return 'user';
  const normalized = value.trim().toLowerCase();
  if (normalized === 'admin') return 'admin';
  if (normalized === 'staff' || normalized === 'librarian') return 'staff';
  return 'user';
};

type SessionUser = {
  id: string;
  email: string;
  role: DashboardRole;
};

type UserRow = {
  id: string;
  email: string;
  role: string | null;
};

const fetchUserByEmail = async (email: string) => {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('Users')
    .select('id, email, role')
    .eq('email', email)
    .maybeSingle<UserRow>();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }

  if (!data) return null;

  return {
    id: data.id,
    email: data.email,
    role: toDashboardRole(data.role),
  } satisfies SessionUser;
};

const ensureUserRecord = async (email: string): Promise<SessionUser> => {
  const normalizedEmail = email.toLowerCase();
  const existing = await fetchUserByEmail(normalizedEmail);
  if (existing) {
    return existing;
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('Users')
    .insert({ email: normalizedEmail, role: 'user' })
    .select('id, email, role')
    .single<UserRow>();

  if (error) {
    if (error.code === '23505') {
      const retry = await fetchUserByEmail(normalizedEmail);
      if (retry) return retry;
    }
    throw error;
  }

  if (!data) {
    throw new Error('Supabase returned no data while creating user record.');
  }

  return {
    id: data.id,
    email: data.email,
    role: toDashboardRole(data.role),
  };
};

const ensureProfile = async (userId: string) => {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from('UserProfile')
    .upsert(
      {
        user_id: userId,
        visibility: 'campus',
      },
      { onConflict: 'user_id' },
    );

  if (error) {
    console.error('Failed to upsert user profile', error);
  }
};

export const authOptions: NextAuthOptions = {
  providers: [
    ...(linkedInClientId && linkedInClientSecret
      ? [
          LinkedInProvider({
            clientId: linkedInClientId,
            clientSecret: linkedInClientSecret,
            authorization: {
              params: { scope: 'openid profile email' },
            },
          }),
        ]
      : []),
    AzureADProvider({
      clientId: clientId ?? 'development-client-id',
      clientSecret: clientSecret ?? 'development-client-secret',
      issuer: `https://login.microsoftonline.com/${tenantId ?? 'common'}/v2.0`,
      authorization: {
        params: {
          scope: 'openid profile offline_access email',
          // Force the Microsoft account picker every sign-in so a user can
          // switch between accounts (instead of auto-using the cached one).
          prompt: 'select_account',
        },
      },
      profile(profile) {
        const data = profile as Record<string, unknown>;
        const email =
          typeof data.mail === 'string'
            ? data.mail
            : typeof data.email === 'string'
              ? data.email
              : typeof data.preferred_username === 'string'
                ? data.preferred_username
                : typeof data.userPrincipalName === 'string'
                  ? data.userPrincipalName
                  : null;

        const userPrincipalName =
          typeof data.userPrincipalName === 'string'
            ? data.userPrincipalName
            : typeof data.preferred_username === 'string'
              ? data.preferred_username
              : null;

        return {
          id: (data.sub as string | undefined) ?? (data.oid as string | undefined) ?? (data.id as string | undefined) ?? '',
          name: (data.name as string | undefined) ?? (data.displayName as string | undefined) ?? null,
          email: typeof email === 'string' ? email.toLowerCase() : null,
          userPrincipalName,
          preferred_username: typeof data.preferred_username === 'string' ? data.preferred_username : null,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async signIn({ user }) {
      const rawEmail =
        user?.email ??
        (user as { userPrincipalName?: string })?.userPrincipalName ??
        (user as { preferred_username?: string })?.preferred_username ??
        '';
      const email = rawEmail.trim().toLowerCase();

      if (!email) {
        console.warn('Azure AD sign-in attempt without email address was rejected.');
        return false;
      }

      try {
        const record = await ensureUserRecord(email);
        await ensureProfile(record.id);

        const enhanced = user as typeof user & { id?: string; role?: DashboardRole };
        enhanced.id = record.id;
        enhanced.role = record.role;

        return true;
      } catch (error) {
        console.error('Failed to sync user record during sign-in', error);
        // Allow sign-in even if Supabase is temporarily unreachable.
        // The jwt callback will re-sync the record on the next request.
        return true;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        const enhanced = user as typeof user & { id?: string; role?: DashboardRole };
        if (enhanced.id) {
          token.sub = enhanced.id;
        }
        if (enhanced.role) {
          (token as JWT & { role?: DashboardRole }).role = enhanced.role;
        }
        if (user.email) {
          token.email = user.email.toLowerCase();
        }
        return token;
      }

      const currentRole = (token as JWT & { role?: DashboardRole }).role;
      if (token.email) {
        try {
          const record = await fetchUserByEmail(token.email.toLowerCase());
          if (record) {
            token.sub = record.id;
            (token as JWT & { role?: DashboardRole }).role = record.role;
          }
        } catch (error) {
          console.error('Failed to refresh JWT payload from Supabase', error);
        }
      } else if (!currentRole && token.sub) {
        try {
          const supabase = getSupabaseServerClient();
          const { data, error } = await supabase
            .from('Users')
            .select('role')
            .eq('id', token.sub)
            .maybeSingle<{ role: string | null }>();
          if (!error && data) {
            (token as JWT & { role?: DashboardRole }).role = toDashboardRole(data.role);
          }
        } catch (error) {
          console.error('Failed to backfill role from Supabase', error);
        }
      }

      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        (session.user as typeof session.user & { id?: string }).id =
          typeof token.sub === 'string' ? token.sub : '';
        (session.user as typeof session.user & { role?: DashboardRole }).role =
          (token as JWT & { role?: DashboardRole }).role ?? 'user';
      }
      return session;
    },
  },
  trustHost: true,
  secret: resolvedSecret,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

const getSession = async () => {
  const session = await auth();
  const user = session?.user as Session['user'] & {
    id?: string;
    email?: string | null;
    role?: DashboardRole | null;
  };

  if (!user?.id || !user.email) {
    throw new UnauthorizedError();
  }

  return {
    id: user.id,
    email: user.email.toLowerCase(),
    role: toDashboardRole(user.role),
  } satisfies SessionUser;
};

export async function getSessionUser(): Promise<SessionUser> {
  return getSession();
}

export async function requireUser(): Promise<SessionUser> {
  return getSessionUser();
}

export async function requireStaff(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (user.role === 'staff' || user.role === 'admin') {
    return user;
  }
  throw new ForbiddenError('Staff role required');
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (user.role === 'admin') {
    return user;
  }
  throw new ForbiddenError('Admin role required');
}

