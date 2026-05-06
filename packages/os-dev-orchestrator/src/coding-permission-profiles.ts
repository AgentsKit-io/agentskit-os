// #353 — reusable permission profiles for coding-agent runs.

export type CodingPermissionProfileId =
  | 'read_only_review'
  | 'edit_without_shell'
  | 'test_runner'
  | 'full_sandbox'
  | 'release_manager'

export type CodingNetworkPolicy = {
  readonly egressAllow: readonly string[]
  readonly egressDeny: readonly string[]
}

export type CodingGitOps = {
  readonly read: boolean
  readonly write: boolean
  readonly push: boolean
  readonly tag: boolean
  readonly release: boolean
}

export type CodingPermissionProfile = {
  readonly id: CodingPermissionProfileId
  readonly displayName: string
  readonly description: string
  readonly writeAllow: readonly string[]
  readonly writeDeny: readonly string[]
  readonly shellAllow: readonly string[]
  readonly shellDeny: readonly string[]
  readonly network: CodingNetworkPolicy
  readonly secretsAllow: readonly string[]
  readonly git: CodingGitOps
}

const profile = (p: CodingPermissionProfile): CodingPermissionProfile => p

export const CODING_PERMISSION_PROFILES: Readonly<Record<CodingPermissionProfileId, CodingPermissionProfile>> = {
  read_only_review: profile({
    id: 'read_only_review',
    displayName: 'Read-only review',
    description: 'Inspect repo + open traces; cannot edit files, run shell, or touch git.',
    writeAllow: [],
    writeDeny: ['**/*'],
    shellAllow: [],
    shellDeny: ['*'],
    network: { egressAllow: [], egressDeny: ['*'] },
    secretsAllow: [],
    git: { read: true, write: false, push: false, tag: false, release: false },
  }),
  edit_without_shell: profile({
    id: 'edit_without_shell',
    displayName: 'Edit without shell',
    description: 'Edit files in scope; shell + network denied. Safe for autopatch.',
    writeAllow: ['**/*'],
    writeDeny: ['.git/**', '**/.env', '**/secrets/**'],
    shellAllow: [],
    shellDeny: ['*'],
    network: { egressAllow: [], egressDeny: ['*'] },
    secretsAllow: [],
    git: { read: true, write: true, push: false, tag: false, release: false },
  }),
  test_runner: profile({
    id: 'test_runner',
    displayName: 'Test runner',
    description: 'Run tests/lint, no file edits except `coverage/` and `.cache/`.',
    writeAllow: ['coverage/**', '.cache/**', 'node_modules/.vitest/**'],
    writeDeny: ['.git/**', '**/.env', '**/secrets/**'],
    shellAllow: [
      'pnpm test*', 'pnpm lint*', 'pnpm vitest*', 'npm test*', 'yarn test*',
      'jest*', 'vitest*', 'pytest*', 'cargo test*', 'go test*',
    ],
    shellDeny: ['rm -rf*', 'sudo*', 'curl*', 'wget*'],
    network: { egressAllow: ['localhost', '127.0.0.1'], egressDeny: ['*'] },
    secretsAllow: ['CI', 'TEST_*'],
    git: { read: true, write: false, push: false, tag: false, release: false },
  }),
  full_sandbox: profile({
    id: 'full_sandbox',
    displayName: 'Full sandbox',
    description: 'Edits + shell + git read/write inside the sandbox; egress allowlist.',
    writeAllow: ['**/*'],
    writeDeny: ['.git/objects/**', '**/.env', '**/secrets/**'],
    shellAllow: ['*'],
    shellDeny: ['rm -rf /', 'sudo*', ':(){ :|:& };:'],
    network: {
      egressAllow: ['registry.npmjs.org', 'github.com', 'api.github.com', 'pypi.org', 'crates.io'],
      egressDeny: ['*'],
    },
    secretsAllow: ['CI', 'PROVIDER_*'],
    git: { read: true, write: true, push: false, tag: false, release: false },
  }),
  release_manager: profile({
    id: 'release_manager',
    displayName: 'Release manager',
    description: 'Tagging + push + release. Strict shell allowlist; HITL recommended.',
    writeAllow: ['CHANGELOG.md', 'package.json', 'packages/**/package.json', 'pnpm-lock.yaml'],
    writeDeny: ['**/.env', '**/secrets/**'],
    shellAllow: [
      'pnpm changeset*', 'pnpm build*', 'pnpm release*',
      'git add*', 'git commit*', 'git tag*', 'git push*',
      'gh release*',
    ],
    shellDeny: ['rm -rf*', 'sudo*'],
    network: {
      egressAllow: ['github.com', 'api.github.com', 'registry.npmjs.org'],
      egressDeny: ['*'],
    },
    secretsAllow: ['GITHUB_TOKEN', 'NPM_TOKEN'],
    git: { read: true, write: true, push: true, tag: true, release: true },
  }),
}

export const listCodingPermissionProfiles = (): readonly CodingPermissionProfile[] =>
  Object.values(CODING_PERMISSION_PROFILES)

export const getCodingPermissionProfile = (id: string): CodingPermissionProfile | undefined =>
  (CODING_PERMISSION_PROFILES as Record<string, CodingPermissionProfile | undefined>)[id]

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const globToRegExp = (pattern: string): RegExp => {
  if (pattern === '*') return /^.*$/i
  // Translate ** and *; treat path separators normally
  let p = ''
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i]
    if (ch === '*' && pattern[i + 1] === '*') {
      p += '.*'
      i += 1
    } else if (ch === '*') {
      p += '[^/]*'
    } else {
      p += escapeRe(ch as string)
    }
  }
  return new RegExp(`^${p}$`, 'i')
}

const matchesAny = (patterns: readonly string[], value: string): boolean =>
  patterns.some((pat) => globToRegExp(pat).test(value))

export type CodingOperation =
  | { readonly kind: 'file_write'; readonly path: string }
  | { readonly kind: 'shell'; readonly command: string }
  | { readonly kind: 'network'; readonly host: string }
  | { readonly kind: 'secret'; readonly name: string }
  | { readonly kind: 'git'; readonly action: keyof CodingGitOps }

export type CodingPermissionDecision = {
  readonly allow: boolean
  readonly profileId: CodingPermissionProfileId
  readonly reason: string
  readonly code: string
}

const decision = (
  allow: boolean,
  profileId: CodingPermissionProfileId,
  code: string,
  reason: string,
): CodingPermissionDecision => ({ allow, profileId, code, reason })

export const evaluateCodingPermission = (
  profile: CodingPermissionProfile,
  op: CodingOperation,
): CodingPermissionDecision => {
  switch (op.kind) {
    case 'file_write': {
      if (matchesAny(profile.writeDeny, op.path)) {
        return decision(false, profile.id, 'profile.write_denied', `path matches writeDeny in ${profile.id}`)
      }
      if (profile.writeAllow.length === 0) {
        return decision(false, profile.id, 'profile.write_no_allow', `${profile.id} has no writeAllow patterns`)
      }
      if (!matchesAny(profile.writeAllow, op.path)) {
        return decision(false, profile.id, 'profile.write_not_allowlisted', `path not in writeAllow for ${profile.id}`)
      }
      return decision(true, profile.id, 'profile.write_allowed', 'ok')
    }
    case 'shell': {
      if (matchesAny(profile.shellDeny, op.command)) {
        return decision(false, profile.id, 'profile.shell_denied', `command matches shellDeny in ${profile.id}`)
      }
      if (profile.shellAllow.length === 0) {
        return decision(false, profile.id, 'profile.shell_no_allow', `${profile.id} forbids shell`)
      }
      if (!matchesAny(profile.shellAllow, op.command)) {
        return decision(false, profile.id, 'profile.shell_not_allowlisted', `command not in shellAllow for ${profile.id}`)
      }
      return decision(true, profile.id, 'profile.shell_allowed', 'ok')
    }
    case 'network': {
      if (matchesAny(profile.network.egressDeny, op.host) && !matchesAny(profile.network.egressAllow, op.host)) {
        return decision(false, profile.id, 'profile.egress_denied', `host blocked by ${profile.id}`)
      }
      if (profile.network.egressAllow.length > 0 && !matchesAny(profile.network.egressAllow, op.host)) {
        return decision(false, profile.id, 'profile.egress_not_allowlisted', `host not in egressAllow for ${profile.id}`)
      }
      return decision(true, profile.id, 'profile.egress_allowed', 'ok')
    }
    case 'secret': {
      if (!matchesAny(profile.secretsAllow, op.name)) {
        return decision(false, profile.id, 'profile.secret_not_allowlisted', `secret not in secretsAllow for ${profile.id}`)
      }
      return decision(true, profile.id, 'profile.secret_allowed', 'ok')
    }
    case 'git': {
      if (!profile.git[op.action]) {
        return decision(false, profile.id, 'profile.git_op_denied', `${op.action} not allowed by ${profile.id}`)
      }
      return decision(true, profile.id, 'profile.git_op_allowed', 'ok')
    }
    default: {
      const _x: never = op
      throw new Error(`unknown op: ${String(_x)}`)
    }
  }
}

export type CodingPermissionAuditEvent = {
  readonly schemaVersion: '1.0'
  readonly at: string
  readonly providerId: string
  readonly taskId: string
  readonly profileId: CodingPermissionProfileId
  readonly operation: CodingOperation
  readonly decision: CodingPermissionDecision
}

export const buildCodingPermissionAuditEvent = (args: {
  readonly providerId: string
  readonly taskId: string
  readonly profile: CodingPermissionProfile
  readonly operation: CodingOperation
  readonly decision: CodingPermissionDecision
  readonly at?: string
}): CodingPermissionAuditEvent => ({
  schemaVersion: '1.0',
  at: args.at ?? new Date().toISOString(),
  providerId: args.providerId,
  taskId: args.taskId,
  profileId: args.profile.id,
  operation: args.operation,
  decision: args.decision,
})
