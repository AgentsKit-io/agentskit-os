// Per #81 — Visual Integration Hub: 1-click OAuth.
// Pure: provider registry + connection-state machine + URL builder. Caller
// drives the actual HTTP redirect / token exchange at the runtime boundary.

export type OAuthProvider = {
  readonly id: string
  readonly displayName: string
  readonly authorizationUrl: string
  readonly tokenUrl: string
  /** Default scopes attached when the workspace doesn't override them. */
  readonly defaultScopes: readonly string[]
}

export type OAuthConnectionState =
  | 'pending'
  | 'authorizing'
  | 'connected'
  | 'errored'
  | 'revoked'

export type OAuthConnection = {
  readonly providerId: string
  readonly workspaceId: string
  readonly state: OAuthConnectionState
  readonly scopes: readonly string[]
  readonly createdAt: string
  readonly lastTransitionAt: string
  readonly errorMessage?: string
}

export type AuthorizeArgs = {
  redirectUri: string
  state: string
  scopes?: readonly string[]
}

export type TransitionArgs = {
  at?: string
  errorMessage?: string
}

export type OAuthHubRegistry = {
  readonly registerProvider: (provider: OAuthProvider) => 'registered' | 'conflict'
  readonly getProvider: (id: string) => OAuthProvider | undefined
  readonly listProviders: () => readonly OAuthProvider[]
  readonly buildAuthorizeUrl: (providerId: string, args: AuthorizeArgs) => string
  readonly transition: (
    connection: OAuthConnection,
    next: OAuthConnectionState,
    args?: TransitionArgs,
  ) => OAuthConnection
}

const ALLOWED: ReadonlySet<string> = new Set([
  'pending>authorizing',
  'authorizing>connected',
  'authorizing>errored',
  'connected>revoked',
  'connected>errored',
  'errored>authorizing',
  'errored>revoked',
])

const isTransitionAllowed = (from: OAuthConnectionState, to: OAuthConnectionState): boolean =>
  ALLOWED.has(`${from}>${to}`)

const encodeQuery = (args: Readonly<Record<string, string>>): string =>
  Object.entries(args)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')

/**
 * Build a 1-click OAuth integration hub registry (#81). Pure; caller
 * persists `OAuthConnection` records and drives the redirect at runtime.
 */
export const createOAuthHub = (): OAuthHubRegistry => {
  const providers = new Map<string, OAuthProvider>()

  return {
    registerProvider: (provider) => {
      if (providers.has(provider.id)) return 'conflict'
      providers.set(provider.id, provider)
      return 'registered'
    },
    getProvider: (id) => providers.get(id),
    listProviders: () => [...providers.values()].sort((a, b) => a.id.localeCompare(b.id)),
    buildAuthorizeUrl: (providerId, args) => {
      const p = providers.get(providerId)
      if (p === undefined) throw new Error(`oauth-hub: provider not registered: ${providerId}`)
      const scopes = args.scopes ?? p.defaultScopes
      const query = encodeQuery({
        client_id: providerId,
        redirect_uri: args.redirectUri,
        response_type: 'code',
        scope: scopes.join(' '),
        state: args.state,
      })
      const sep = p.authorizationUrl.includes('?') ? '&' : '?'
      return `${p.authorizationUrl}${sep}${query}`
    },
    transition: (connection, next, args = {}) => {
      if (!isTransitionAllowed(connection.state, next)) {
        throw new Error(
          `oauth-hub: transition not allowed: ${connection.state} → ${next}`,
        )
      }
      return {
        ...connection,
        state: next,
        lastTransitionAt: args.at ?? new Date().toISOString(),
        ...(args.errorMessage !== undefined ? { errorMessage: args.errorMessage } : {}),
      }
    },
  }
}
