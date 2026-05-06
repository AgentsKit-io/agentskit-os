// Per #190 — multi-runtime sandbox plugin contract + registry.
// Pure: contracts every sandbox backend (container, vm, webcontainer, e2b)
// implements; the host runtime picks one based on policy and capability.

export type SandboxBackendKind = 'docker' | 'firecracker-vm' | 'webcontainer' | 'e2b' | 'noop'

export type SandboxResourceLimits = {
  readonly memoryMb?: number
  readonly cpuMillicores?: number
  readonly timeoutMs?: number
  readonly diskMb?: number
}

export type SandboxNetworkPolicy = 'none' | 'restricted' | 'full'

export type SandboxMount = {
  readonly host: string
  readonly target: string
  readonly readOnly?: boolean
}

export type SandboxLaunchSpec = {
  readonly image?: string
  readonly command: readonly string[]
  readonly env?: Readonly<Record<string, string>>
  readonly cwd?: string
  readonly mounts?: readonly SandboxMount[]
  readonly network: SandboxNetworkPolicy
  readonly limits: SandboxResourceLimits
}

export type SandboxRunResult = {
  readonly exitCode: number
  readonly stdout: string
  readonly stderr: string
  readonly durationMs: number
  readonly truncated?: boolean
}

export type SandboxCapability =
  | 'fs_isolation'
  | 'network_egress_off'
  | 'memory_limit'
  | 'cpu_limit'
  | 'timeout'
  | 'biometric_unlock'

export type SandboxBackend = {
  readonly kind: SandboxBackendKind
  readonly displayName: string
  readonly capabilities: readonly SandboxCapability[]
  /** Validate the launch spec before allocation; returns reason strings. */
  readonly validate: (spec: SandboxLaunchSpec) => readonly string[]
  /** Run a single command in the sandbox; pure host wrapper provides isolation. */
  readonly run: (spec: SandboxLaunchSpec) => Promise<SandboxRunResult>
}

export type SandboxRegistration =
  | { readonly kind: 'registered'; readonly backendKind: SandboxBackendKind }
  | { readonly kind: 'conflict'; readonly backendKind: SandboxBackendKind; readonly existingDisplayName: string }

export type SandboxRegistry = {
  readonly register: (backend: SandboxBackend) => SandboxRegistration
  readonly unregister: (kind: SandboxBackendKind) => boolean
  readonly get: (kind: SandboxBackendKind) => SandboxBackend | undefined
  readonly list: () => readonly SandboxBackend[]
  /** Pick the first registered backend whose capabilities cover `required`. */
  readonly pick: (required: readonly SandboxCapability[]) => SandboxBackend | undefined
}

const covers = (backend: SandboxBackend, required: readonly SandboxCapability[]): boolean =>
  required.every((c) => backend.capabilities.includes(c))

export const createSandboxRegistry = (): SandboxRegistry => {
  const byKind = new Map<SandboxBackendKind, SandboxBackend>()

  return {
    register: (backend) => {
      const existing = byKind.get(backend.kind)
      if (existing !== undefined) {
        return {
          kind: 'conflict',
          backendKind: backend.kind,
          existingDisplayName: existing.displayName,
        }
      }
      byKind.set(backend.kind, backend)
      return { kind: 'registered', backendKind: backend.kind }
    },
    unregister: (kind) => byKind.delete(kind),
    get: (kind) => byKind.get(kind),
    list: () => [...byKind.values()],
    pick: (required) => {
      for (const b of byKind.values()) {
        if (covers(b, required)) return b
      }
      return undefined
    },
  }
}
