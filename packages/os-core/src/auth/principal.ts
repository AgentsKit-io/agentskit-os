import { z } from 'zod'
import { Slug } from '../schema/_primitives.js'

const PluginSignatureShape = z.object({
  algorithm: z.enum(['ed25519', 'rsa-sha256']),
  publicKey: z.string().min(64).max(8192),
  signature: z.string().min(64).max(8192),
})

export const PrincipalKind = z.enum(['user', 'agent', 'plugin', 'trigger', 'system', 'service'])
export type PrincipalKind = z.infer<typeof PrincipalKind>

const Id = z.string().min(1).max(128)
const WorkspaceId = Slug

const UserPrincipal = z.object({
  kind: z.literal('user'),
  id: Id,
  workspaceId: WorkspaceId,
})

const AgentPrincipal: z.ZodType<unknown> = z.lazy(() =>
  z.object({
    kind: z.literal('agent'),
    id: Id,
    workspaceId: WorkspaceId,
    parent: PrincipalRef.optional(),
  }),
)

const PluginPrincipal = z.object({
  kind: z.literal('plugin'),
  id: Slug,
  workspaceId: WorkspaceId,
  signature: PluginSignatureShape,
})

const TriggerPrincipal = z.object({
  kind: z.literal('trigger'),
  id: Id,
  workspaceId: WorkspaceId,
})

const SystemPrincipal = z.object({
  kind: z.literal('system'),
  id: z.enum(['os-core', 'os-cli', 'os-runtime', 'os-desktop', 'os-cloud-sync']),
})

const ServicePrincipal = z.object({
  kind: z.literal('service'),
  id: Id,
  workspaceId: WorkspaceId,
})

export const Principal = z.discriminatedUnion('kind', [
  UserPrincipal,
  PluginPrincipal,
  TriggerPrincipal,
  SystemPrincipal,
  ServicePrincipal,
  // AgentPrincipal handled separately below due to recursive shape
])
export type Principal = z.infer<typeof Principal>

export const PrincipalRef: z.ZodType<unknown> = z.lazy(() =>
  z.union([Principal, AgentPrincipal]),
)
export type PrincipalRef = z.infer<typeof PrincipalRef>

export const parsePrincipal = (input: unknown): PrincipalRef =>
  PrincipalRef.parse(input) as PrincipalRef
export const safeParsePrincipal = (input: unknown) => PrincipalRef.safeParse(input)
