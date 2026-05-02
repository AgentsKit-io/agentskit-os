import { z } from 'zod'
import { PrincipalRef } from './principal.js'

export const Action = z
  .string()
  .min(1)
  .max(32)
  .regex(/^[a-z][a-z0-9_]*$/, { message: 'must be lowercase action verb' })
export type Action = z.infer<typeof Action>

export const ResourceRef = z
  .string()
  .min(3)
  .max(256)
  .regex(/^[a-z][a-z0-9_-]*:[a-zA-Z0-9_./*-]+(:[a-zA-Z0-9_./*-]+)*$/, {
    message: 'must be <domain>:<id>[:<sub>...]',
  })
export type ResourceRef = z.infer<typeof ResourceRef>

export const CapabilityConstraints = z.object({
  rateLimit: z
    .object({
      perMin: z.number().int().positive().max(1_000_000),
    })
    .optional(),
  budget: z
    .object({
      usd: z.number().nonnegative().optional(),
      tokens: z.number().int().nonnegative().optional(),
    })
    .optional(),
  expiresAt: z.string().datetime({ offset: true }).optional(),
  argsSchema: z.string().max(512).optional(), // dataschema URI; runtime resolves
})
export type CapabilityConstraints = z.infer<typeof CapabilityConstraints>

export const CapabilitySignature = z.object({
  algorithm: z.enum(['ed25519']),
  publicKey: z.string().min(64).max(8192),
  signature: z.string().min(64).max(8192),
})
export type CapabilitySignature = z.infer<typeof CapabilitySignature>

export const Capability = z.object({
  id: z.string().min(1).max(64),
  resource: ResourceRef,
  actions: z.array(Action).min(1).max(16),
  constraints: CapabilityConstraints.optional(),
  delegatable: z.boolean().default(false),
  issuer: PrincipalRef,
  proof: CapabilitySignature.optional(),
})
export type Capability = z.infer<typeof Capability>

export const AuthContext = z.object({
  principal: PrincipalRef,
  capabilities: z.array(Capability).max(1024),
})
export type AuthContext = z.infer<typeof AuthContext>

export const parseCapability = (input: unknown): Capability => Capability.parse(input)
export const safeParseCapability = (input: unknown) => Capability.safeParse(input)
export const parseAuthContext = (input: unknown): AuthContext => AuthContext.parse(input)
export const safeParseAuthContext = (input: unknown) => AuthContext.safeParse(input)
