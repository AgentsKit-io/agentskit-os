---
'@agentskit/os-core': patch
---

#159 / #160 / #161 / #162 / #163 / #164: add integration trigger schemas (`DiscordTrigger`, `TwilioTrigger`, `SentryTrigger`, `PagerDutyTrigger`, `StripeTrigger`, `S3Trigger`) into the discriminated `TriggerConfig` union, plus `INTEGRATION_TRIGGER_CONTRACTS` and `registerIntegrationTriggerContracts(registry)` to mount them on the runtime trigger registry. Pure validation + dispatch; the actual integration adapter (Discord gateway, Twilio webhook, Sentry alert, PagerDuty event, Stripe webhook, S3 SNS) lives at the runtime boundary.
