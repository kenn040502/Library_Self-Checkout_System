import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getDashboardSession } from '@/app/lib/auth/session';
import { getSupabaseServerClient } from '@/app/lib/supabase/server';
import ProfileNameForm from '@/app/profile/profileNameForm';
import ProfileAvatarForm from '@/app/profile/profileAvatarForm';
import ProfileEditForm from '@/app/profile/profileEditForm';
import BlurFade from '@/app/ui/magicUi/blurFade';
import RoleBadge from '@/app/ui/dashboard/primitives/RoleBadge';
import { ChevronRightIcon } from '@heroicons/react/24/outline';

type ProfileRow = {
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  preferred_language?: string | null;
  bio?: string | null;
  faculty?: string | null;
  department?: string | null;
  intake_year?: number | null;
  student_id?: string | null;
  links?: unknown;
  visibility?: string | null;
};

type ProfileLinks = Array<{ label: string; url: string }>;

const normalizeLinks = (value: unknown): ProfileLinks => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((entry, index) => {
        if (typeof entry === 'string') {
          return { label: `Link ${index + 1}`, url: entry };
        }
        if (entry && typeof entry === 'object') {
          const labelCandidate = (entry as { label?: unknown }).label;
          const urlCandidate = (entry as { url?: unknown }).url;
          const label =
            typeof labelCandidate === 'string' && labelCandidate.trim().length > 0
              ? labelCandidate
              : `Link ${index + 1}`;
          const url =
            typeof urlCandidate === 'string' && urlCandidate.trim().length > 0 ? urlCandidate : null;
          if (!url) return null;
          return { label, url };
        }
        return null;
      })
      .filter((entry): entry is { label: string; url: string } => Boolean(entry));
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, url]) => typeof url === 'string' && (url as string).trim().length > 0)
      .map(([label, url]) => ({
        label,
        url: url as string,
      }));
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return [{ label: 'Link', url: value }];
  }

  return [];
};

const formatVisibility = (value?: string | null) => {
  if (!value) return 'Campus';
  if (value === value.toUpperCase()) {
    const normalized = value.toLowerCase();
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }
  return value;
};

const formatMemberSince = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date);
};

const ProfileValue = ({ value }: { value?: string | null }) => {
  if (value && value.trim().length > 0) {
    return <span className="font-medium text-ink dark:text-on-dark">{value}</span>;
  }
  return <span className="font-sans text-caption text-muted-soft dark:text-on-dark-soft">Not provided</span>;
};

export default async function ProfilePage() {
  const session = await getDashboardSession();
  const user = session.user;

  if (!user) {
    redirect(`/login?callbackUrl=${encodeURIComponent('/profile')}`);
  }

  const supabase = getSupabaseServerClient();
  const [{ data: profileRow, error: profileError }, { data: userRow, error: userError }] =
    await Promise.all([
      supabase
        .from('UserProfile')
        .select(
          `
            display_name,
            username,
            avatar_url,
            phone,
            preferred_language,
            bio,
            faculty,
            department,
            intake_year,
            student_id,
            links,
            visibility
          `,
        )
        .eq('user_id', user.id)
        .maybeSingle<ProfileRow>(),
      supabase
        .from('Users')
        .select('created_at')
        .eq('id', user.id)
        .maybeSingle<{ created_at: string | null }>(),
    ]);

  if (profileError) console.error('Failed to load profile', profileError);
  if (userError) console.error('Failed to load user metadata', userError);

  const profile = profileRow ?? {};
  const isPrivileged = user.role === 'staff' || user.role === 'admin';
  const memberSince = formatMemberSince(userRow?.created_at ?? null);
  const visibilityLabel = formatVisibility(profile.visibility);
  const links = normalizeLinks(profile.links);
  const preferredName = profile.display_name ?? user.name ?? null;

  return (
    <main className="min-h-screen bg-canvas py-5 text-ink transition-colors sm:py-10 dark:bg-dark-canvas dark:text-on-dark">
      <title>My Profile</title>

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Page header */}
        <BlurFade delay={0.05} yOffset={12}>
          <header className="mb-5 border-b border-hairline pb-4 dark:border-dark-hairline">
            <p className="mb-1 font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">
              Account
            </p>
            <h1 className="font-display text-display-md tracking-tight text-ink dark:text-on-dark sm:text-display-lg">
              My Profile
            </h1>
            <p className="mt-1.5 font-sans text-body-sm text-body dark:text-on-dark/80">
              Keep your identity and contact details up to date.
            </p>
          </header>
        </BlurFade>

        <div className="grid gap-3 sm:gap-4 lg:grid-cols-[300px_1fr]">
          {/* ── LEFT COLUMN — identity card + summary ───────────────────── */}
          <aside className="space-y-3">
            <BlurFade delay={0.1} yOffset={12}>
              <section className="rounded-card border border-hairline bg-surface-card p-2.5 sm:p-3 dark:border-dark-hairline dark:bg-dark-surface-card">
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-2">
                    <ProfileAvatarForm
                      avatarUrl={profile.avatar_url ?? null}
                      displayName={preferredName}
                    />
                  </div>
                  <p
                    className="
                      max-w-full
                      truncate
                      font-display
                      text-[20px]
                      tracking-tight
                      text-ink
                      dark:text-on-dark
                      sm:text-[24px]
                    "
                    title={preferredName ?? user.email ?? 'My Profile'}
                  >
                    {preferredName ?? user.email ?? 'My Profile'}
                  </p>
                  {profile.username && (
                    <p className="mt-0.5 font-mono text-code text-muted-soft dark:text-on-dark-soft">
                      @{profile.username}
                    </p>
                  )}
                  <p
                    className="mt-1 w-full truncate font-sans text-[10px] text-muted dark:text-on-dark-soft"
                    title={user.email ?? 'Email unavailable'}
                  >
                    {user.email ?? 'Email unavailable'}
                  </p>
                  <div className="mt-1.5 flex flex-wrap justify-center gap-1">
                    <RoleBadge role={user.role ?? 'user'} />
                    <span className="inline-flex items-center rounded-pill border border-hairline bg-surface-cream-strong px-2 py-0.5 font-sans text-caption-uppercase text-muted dark:border-dark-hairline dark:bg-dark-surface-strong dark:text-on-dark-soft">
                      {visibilityLabel.toUpperCase()}
                    </span>
                  </div>
                </div>
              </section>
            </BlurFade>

            <BlurFade delay={0.18} yOffset={12}>
              <section className="rounded-card border border-hairline bg-surface-card p-3 sm:p-4 dark:border-dark-hairline dark:bg-dark-surface-card">
                <p className="mb-2.5 font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">
                  Activity summary
                </p>
                <dl className="space-y-2 font-sans text-body-sm">
                  <div className="flex items-baseline justify-between">
                    <dt className="text-muted dark:text-on-dark-soft">Faculty</dt>
                    <dd className="font-medium text-ink dark:text-on-dark">
                      {profile.faculty ?? '—'}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <dt className="text-muted dark:text-on-dark-soft">Department</dt>
                    <dd className="font-medium text-ink dark:text-on-dark">
                      {profile.department ?? '—'}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <dt className="text-muted dark:text-on-dark-soft">Intake year</dt>
                    <dd className="font-mono text-code text-ink dark:text-on-dark">
                      {profile.intake_year ?? '—'}
                    </dd>
                  </div>
                  {memberSince && (
                    <div className="flex items-baseline justify-between border-t border-hairline pt-3 dark:border-dark-hairline">
                      <dt className="text-muted dark:text-on-dark-soft">Member since</dt>
                      <dd className="font-mono text-code text-ink dark:text-on-dark">
                        {memberSince}
                      </dd>
                    </div>
                  )}
                </dl>
              </section>
            </BlurFade>
          </aside>

          {/* ── RIGHT COLUMN — identity + contact + links ───────────────── */}
          <div className="space-y-3">
            <BlurFade delay={0.22} yOffset={12}>
              <section className="rounded-card border border-hairline bg-surface-card p-3 sm:p-4 dark:border-dark-hairline dark:bg-dark-surface-card">
                <h2 className="mb-2 font-display text-title-lg tracking-tight text-ink dark:text-on-dark sm:text-display-sm">
                  Identity
                </h2>
                <div className="divide-y divide-hairline dark:divide-dark-hairline">
                  <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">
                      Display name
                    </span>
                    <div className="sm:text-right">
                      <ProfileNameForm
                        displayName={profile.display_name ?? user.name ?? null}
                        username={profile.username ?? null}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">
                      Username
                    </span>
                    <div className="font-sans text-body-sm sm:text-right">
                      <ProfileValue value={profile.username ?? null} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">
                      Student ID
                    </span>
                    <div className="font-sans text-body-sm sm:text-right">
                      <ProfileValue value={profile.student_id ?? null} />
                      {!isPrivileged && (
                        <p className="mt-0.5 font-sans text-caption text-muted-soft dark:text-on-dark-soft">
                          Managed by admin
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </BlurFade>

            <BlurFade delay={0.28} yOffset={12}>
              <section className="rounded-card border border-hairline bg-surface-card p-4 sm:p-6 dark:border-dark-hairline dark:bg-dark-surface-card">
                <h2 className="mb-3 font-display text-title-lg tracking-tight text-ink dark:text-on-dark sm:text-display-sm">
                  Contact & details
                </h2>
                <ProfileEditForm
                  username={profile.username ?? null}
                  phone={profile.phone ?? null}
                  preferredLanguage={profile.preferred_language ?? null}
                  faculty={profile.faculty ?? null}
                  department={profile.department ?? null}
                  bio={profile.bio ?? null}
                />
              </section>
            </BlurFade>

            <BlurFade delay={0.34} yOffset={12}>
              <section className="rounded-card border border-hairline bg-surface-card dark:border-dark-hairline dark:bg-dark-surface-card">
                <h2 className="px-4 pt-4 font-display text-title-lg tracking-tight text-ink dark:text-on-dark sm:px-6 sm:pt-5 sm:text-display-sm">
                  Links
                </h2>
                {links.length > 0 ? (
                  <ul className="mt-3 divide-y divide-hairline dark:divide-dark-hairline">
                    {links.map((link) => (
                      <li key={`${link.label}-${link.url}`}>
                        <Link
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between px-4 py-3 transition hover:bg-surface-cream-strong dark:hover:bg-dark-surface-strong sm:px-6"
                        >
                          <span className="font-sans text-body-sm font-semibold text-primary dark:text-dark-primary">
                            {link.label}
                          </span>
                          <ChevronRightIcon className="h-4 w-4 text-muted-soft dark:text-on-dark-soft" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-4 pb-4 pt-2 font-sans text-body-sm text-muted dark:text-on-dark-soft sm:px-6 sm:pb-5">
                    No links added yet.
                  </p>
                )}
              </section>
            </BlurFade>
          </div>
        </div>
      </div>
    </main>
  );
}
