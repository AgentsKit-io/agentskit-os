// Per #159–#164 — TriggerContract registrations for integration triggers
// (discord, twilio, sentry, pagerduty, stripe, s3). Pure: each contract
// validates the schema-level config and returns a deterministic dispatched
// outcome; the actual integration adapter (HTTP webhook, polling, S3 SNS,
// etc.) lives at the runtime boundary in @agentskit/tools/integrations/*.

import type {
  DiscordTrigger,
  PagerDutyTrigger,
  S3Trigger,
  SentryTrigger,
  StripeTrigger,
  TriggerConfig,
  TwilioTrigger,
} from '../schema/trigger.js'
import type {
  TriggerContract,
  TriggerDispatch,
  TriggerEvent,
  TriggerRegistry,
} from './contract.js'

const dispatched = (cfg: TriggerConfig, event: TriggerEvent, suffix: string): TriggerDispatch => ({
  kind: 'dispatched',
  runId: `run-${cfg.id}-${event.receivedAt}-${suffix}`,
  flow: cfg.flow,
  input: event.payload,
})

const discordContract: TriggerContract<DiscordTrigger> = {
  kind: 'discord',
  displayName: 'Discord event',
  validate: (cfg) => (cfg.channelId.length === 0 ? ['discord trigger needs a channelId'] : []),
  dispatch: async (cfg, event) => dispatched(cfg, event, 'discord'),
}

const twilioContract: TriggerContract<TwilioTrigger> = {
  kind: 'twilio',
  displayName: 'Twilio event',
  validate: (cfg) => (cfg.toNumber.length === 0 ? ['twilio trigger needs a toNumber'] : []),
  dispatch: async (cfg, event) => dispatched(cfg, event, 'twilio'),
}

const sentryContract: TriggerContract<SentryTrigger> = {
  kind: 'sentry',
  displayName: 'Sentry event',
  validate: (cfg) => (cfg.project.length === 0 ? ['sentry trigger needs a project'] : []),
  dispatch: async (cfg, event) => dispatched(cfg, event, 'sentry'),
}

const pagerdutyContract: TriggerContract<PagerDutyTrigger> = {
  kind: 'pagerduty',
  displayName: 'PagerDuty event',
  validate: (cfg) => (cfg.service.length === 0 ? ['pagerduty trigger needs a service'] : []),
  dispatch: async (cfg, event) => dispatched(cfg, event, 'pagerduty'),
}

const stripeContract: TriggerContract<StripeTrigger> = {
  kind: 'stripe',
  displayName: 'Stripe event',
  validate: (cfg) => {
    const issues: string[] = []
    if (cfg.account.length === 0) issues.push('stripe trigger needs an account')
    if (cfg.event.length === 0) issues.push('stripe trigger needs an event name')
    return issues
  },
  dispatch: async (cfg, event) => dispatched(cfg, event, 'stripe'),
}

const s3Contract: TriggerContract<S3Trigger> = {
  kind: 's3',
  displayName: 'S3 object event',
  validate: (cfg) => {
    const issues: string[] = []
    if (cfg.bucket.length === 0) issues.push('s3 trigger needs a bucket')
    if (cfg.events.length === 0) issues.push('s3 trigger needs at least one event')
    return issues
  },
  dispatch: async (cfg, event) => dispatched(cfg, event, 's3'),
}

export const INTEGRATION_TRIGGER_CONTRACTS: ReadonlyArray<TriggerContract> = [
  discordContract,
  twilioContract,
  sentryContract,
  pagerdutyContract,
  stripeContract,
  s3Contract,
] as ReadonlyArray<TriggerContract>

/**
 * Register every integration TriggerContract on the supplied registry
 * (#159–#164). Returns the registry for chaining.
 */
export const registerIntegrationTriggerContracts = (registry: TriggerRegistry): TriggerRegistry => {
  for (const c of INTEGRATION_TRIGGER_CONTRACTS) {
    registry.register(c)
  }
  return registry
}
