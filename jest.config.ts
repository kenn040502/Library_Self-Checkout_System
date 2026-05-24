import type { Config } from 'jest'
import nextJest from 'next/jest.js'
 

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})
 
// Add any custom config to be passed to Jest
const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  // Add more setup options before each test is run
  // setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  // Ignore nested git-worktree checkouts — they have their own __tests__ dirs
  // that fail with stale module-resolution errors unrelated to this project.
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/.worktrees/',
    '<rootDir>/.claude/worktrees/',
  ],
}
 
// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config)