// Pure types and helpers for profile-field handling.
// No React, no 'use client' — safe to import from server components too.

export type FieldType = 'text' | 'textarea' | 'number' | 'select' | 'json' | 'boolean';

export type ProfileFieldConfig = {
  label: string;
  type: FieldType;
  description?: string;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  maxLength?: number;
  rows?: number;
};

export type ManagedRole = 'user' | 'staff' | 'admin';

export type ManagedUser = {
  id: string;
  email: string;
  role: ManagedRole;
  fullName: string;
  accountDisplayName: string;
  createdAt: string | null;
  updatedAt: string | null;
  profile: Record<string, string>;
  profileFieldTypes: Record<string, FieldType>;
};

export const roleOptions: ManagedRole[] = ['user', 'staff', 'admin'];

export const visibilityOptions = [
  { value: 'public', label: 'Public' },
  { value: 'campus', label: 'Campus' },
  { value: 'private', label: 'Private' },
];

export const baseProfileFieldOrder = [
  'display_name',
  'username',
  'phone',
  'student_id',
  'preferred_language',
  'faculty',
  'department',
  'intake_year',
  'visibility',
  'bio',
  'links',
  'avatar_url',
];

export const PROFILE_FIELD_CONFIG: Record<string, ProfileFieldConfig> = {
  display_name: {
    label: 'Preferred display name',
    type: 'text',
    maxLength: 120,
    placeholder: 'Name shown to patrons',
  },
  username: {
    label: 'Username',
    type: 'text',
    maxLength: 60,
    placeholder: 'Unique username for search login',
  },
  phone: {
    label: 'Phone number',
    type: 'text',
    placeholder: '+60 12 345 6789',
  },
  student_id: {
    label: 'Student ID',
    type: 'text',
    placeholder: 'e.g. 123456',
  },
  preferred_language: {
    label: 'Preferred language',
    type: 'text',
  },
  faculty: {
    label: 'Faculty',
    type: 'text',
  },
  department: {
    label: 'Department',
    type: 'text',
  },
  intake_year: {
    label: 'Intake year',
    type: 'number',
  },
  visibility: {
    label: 'Profile visibility',
    type: 'select',
    options: visibilityOptions,
    description: 'Controls who on campus can view this profile information.',
  },
  bio: {
    label: 'Bio',
    type: 'textarea',
    rows: 4,
    maxLength: 500,
  },
  links: {
    label: 'Links (JSON)',
    type: 'json',
    rows: 4,
    description: 'Provide an array or object of links, e.g. [{"label":"Portfolio","url":"https://"}].',
  },
  avatar_url: {
    label: 'Avatar URL',
    type: 'text',
    placeholder: 'https://…',
  },
};

export const toTitleCase = (value: string) =>
  value
    .split('_')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');

export const inferFieldType = (key: string, value: unknown): FieldType => {
  const configured = PROFILE_FIELD_CONFIG[key];
  if (configured) return configured.type;
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (value && typeof value === 'object') return 'json';
  return 'text';
};

export const toInputValue = (value: unknown, type: FieldType): string => {
  if (value === null || value === undefined) return '';
  if (type === 'json') {
    if (typeof value === 'string') return value;
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  if (type === 'boolean') {
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    return String(value).toLowerCase();
  }
  return String(value);
};

export const sanitizeProfileRow = (profile: Record<string, unknown> | null | undefined) => {
  if (!profile) return {};
  const result: Record<string, unknown> = {};
  Object.entries(profile).forEach(([key, value]) => {
    if (key === 'user_id' || key === 'created_at' || key === 'updated_at') return;
    result[key] = value;
  });
  return result;
};

export type ProfileSanitizeSuccess = {
  ok: true;
  payload: Record<string, unknown>;
  normalizedValues: Record<string, string>;
};

export type ProfileSanitizeFailure = {
  ok: false;
  error: string;
};

export const sanitizeProfileValues = (
  profile: Record<string, string>,
  profileFieldTypes: Record<string, FieldType>,
): ProfileSanitizeSuccess | ProfileSanitizeFailure => {
  const payload: Record<string, unknown> = {};
  const normalizedValues: Record<string, string> = {};

  for (const [key, rawValue] of Object.entries(profile)) {
    const config = PROFILE_FIELD_CONFIG[key];
    const type = profileFieldTypes[key] ?? config?.type ?? 'text';
    const label = config?.label ?? toTitleCase(key);

    if (type === 'json') {
      const trimmed = rawValue.trim();
      if (!trimmed) {
        payload[key] = null;
        normalizedValues[key] = '';
        continue;
      }
      try {
        const parsed = JSON.parse(trimmed);
        payload[key] = parsed;
        normalizedValues[key] = JSON.stringify(parsed, null, 2);
      } catch (err) {
        console.error('Failed to parse JSON profile field', key, err);
        return { ok: false, error: `Field "${label}" must be valid JSON.` };
      }
      continue;
    }

    if (type === 'number') {
      const trimmed = rawValue.trim();
      if (!trimmed) {
        payload[key] = null;
        normalizedValues[key] = '';
        continue;
      }
      const numberValue = Number(trimmed);
      if (Number.isNaN(numberValue)) {
        return { ok: false, error: `Field "${label}" must be a number.` };
      }
      payload[key] = numberValue;
      normalizedValues[key] = String(numberValue);
      continue;
    }

    if (type === 'boolean') {
      const normalized = rawValue.trim().toLowerCase();
      if (!normalized) {
        payload[key] = null;
        normalizedValues[key] = '';
        continue;
      }
      if (normalized === 'true' || normalized === 'false') {
        payload[key] = normalized === 'true';
        normalizedValues[key] = normalized;
        continue;
      }
      return { ok: false, error: `Field "${label}" must be either true or false.` };
    }

    const trimmed = rawValue.trim();
    payload[key] = trimmed === '' ? null : trimmed;
    normalizedValues[key] = trimmed;
  }

  return { ok: true, payload, normalizedValues };
};

export const getProfileKeys = (user: ManagedUser) => {
  const keys = new Set<string>(baseProfileFieldOrder);
  Object.keys(user.profile).forEach((key) => keys.add(key));
  return Array.from(keys);
};
