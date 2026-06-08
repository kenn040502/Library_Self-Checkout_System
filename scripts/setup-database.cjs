#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const dotenv = require('dotenv');
const postgres = require('postgres');

const BASELINE_SCHEMA = 'supabase/schema.sql';

const REQUIRED_MIGRATIONS = [
  'supabase/migrations/20260507_notification_flags.sql',
  'supabase/migrations/20260511_drop_ai_chat_history.sql',
  'supabase/migrations/20260524_general_chat_history_metadata.sql',
  'supabase/migrations/20260604_damage_reports_resolution.sql',
];

function buildSetupPlan() {
  return [BASELINE_SCHEMA, ...REQUIRED_MIGRATIONS];
}

function isPlaceholderValue(value) {
  const text = String(value ?? '').trim();
  return text.length === 0 || /^<.*>$/.test(text) || /to-be-generated/i.test(text);
}

function resolveDatabaseUrl(env = process.env) {
  const candidates = ['POSTGRES_URL_NON_POOLING', 'POSTGRES_URL', 'DATABASE_URL'];
  let firstInvalidKey = candidates[0];

  for (const key of candidates) {
    const value = env[key];
    if (value && !isPlaceholderValue(value)) {
      return value;
    }
    if (value && isPlaceholderValue(value)) {
      firstInvalidKey = key;
    }
  }

  throw new Error(
    `${firstInvalidKey} is missing or still redacted. Set a direct Supabase Postgres connection string before running database setup.`,
  );
}

function parseCliArgs(argv = process.argv.slice(2)) {
  return {
    dryRun: argv.includes('--dry-run'),
    withSeed: argv.includes('--with-seed'),
  };
}

function shouldUseSsl(databaseUrl) {
  const parsed = new URL(databaseUrl);
  return !['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
}

function loadEnvFiles(rootDir) {
  for (const filename of ['.env.local', '.env']) {
    const envPath = path.join(rootDir, filename);
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, override: false, quiet: true });
    }
  }
}

function ensureFilesExist(rootDir, files) {
  const missing = files.filter((file) => !fs.existsSync(path.join(rootDir, file)));
  if (missing.length > 0) {
    throw new Error(`Missing SQL file(s): ${missing.join(', ')}`);
  }
}

async function assertFreshDatabase(sql) {
  const rows = await sql`
    select to_regclass('public."Users"') is not null as users_table_exists
  `;

  if (rows[0]?.users_table_exists) {
    throw new Error(
      'public."Users" already exists. Use a fresh Supabase project/database for handoff setup.',
    );
  }
}

async function executeSqlFile(sql, rootDir, file) {
  const sqlText = fs.readFileSync(path.join(rootDir, file), 'utf8');
  await sql.unsafe(sqlText);
}

function runSeedScript(rootDir) {
  const result = spawnSync('node', ['scripts/seed-books-bulk.mjs', '--apply'], {
    cwd: rootDir,
    stdio: 'inherit',
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error('Book seed script failed.');
  }
}

async function main() {
  const rootDir = process.cwd();
  const args = parseCliArgs();
  const plan = buildSetupPlan();

  loadEnvFiles(rootDir);
  ensureFilesExist(rootDir, plan);

  console.log('Database setup plan:');
  for (const file of plan) {
    console.log(`- ${file}`);
  }

  if (args.withSeed) {
    console.log('- scripts/seed-books-bulk.mjs --apply');
  }

  if (args.dryRun) {
    console.log('Dry run only. No database changes were applied.');
    return;
  }

  const databaseUrl = resolveDatabaseUrl();
  const sql = postgres(databaseUrl, {
    max: 1,
    ssl: shouldUseSsl(databaseUrl) ? 'require' : false,
  });

  try {
    await assertFreshDatabase(sql);

    for (const file of plan) {
      console.log(`Applying ${file}`);
      await executeSqlFile(sql, rootDir, file);
    }

    if (args.withSeed) {
      console.log('Seeding demo book catalogue');
      runSeedScript(rootDir);
    }

    console.log('Database setup completed.');
  } finally {
    await sql.end({ timeout: 5 });
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}

module.exports = {
  BASELINE_SCHEMA,
  REQUIRED_MIGRATIONS,
  buildSetupPlan,
  isPlaceholderValue,
  parseCliArgs,
  resolveDatabaseUrl,
  shouldUseSsl,
};
