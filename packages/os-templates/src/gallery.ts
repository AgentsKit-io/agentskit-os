import { parseAgentConfig, parseFlowConfig } from '@agentskit/os-core'
import type { Template, TemplateMetadata } from './types.js'

type TemplateSpec = {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly category: TemplateMetadata['category']
  readonly categoryLabel?: string
  readonly tags: readonly string[]
  readonly tools: readonly string[]
  readonly triggerKind: TemplateMetadata['triggerKind']
}

export const templateSpecs = [
  {
    "id": "pr-review-3-way",
    "category": "coding",
    "categoryLabel": "Coding",
    "name": "Pr Review 3 Way",
    "description": "Runs three reviewers over a pull request and compares their findings before posting a final summary.",
    "tags": [
      "coding",
      "pr",
      "review",
      "3",
      "way"
    ],
    "tools": [
      "github.pr.read",
      "github.pr.comment",
      "repo.search"
    ],
    "triggerKind": "github"
  },
  {
    "id": "code-explainer",
    "category": "coding",
    "categoryLabel": "Coding",
    "name": "Code Explainer",
    "description": "Explains unfamiliar code paths with a concise narrative and file-level risk notes.",
    "tags": [
      "coding",
      "code",
      "explainer"
    ],
    "tools": [
      "github.pr.read",
      "github.pr.comment",
      "repo.search"
    ],
    "triggerKind": "github"
  },
  {
    "id": "repo-bug-triage",
    "category": "coding",
    "categoryLabel": "Coding",
    "name": "Repo Bug Triage",
    "description": "Classifies incoming bug reports and routes them to the likely owning area.",
    "tags": [
      "coding",
      "repo",
      "bug",
      "triage"
    ],
    "tools": [
      "github.pr.read",
      "github.pr.comment",
      "repo.search"
    ],
    "triggerKind": "github"
  },
  {
    "id": "dependency-upgrade",
    "category": "coding",
    "categoryLabel": "Coding",
    "name": "Dependency Upgrade",
    "description": "Plans and reviews a dependency upgrade with tests, risk notes, and rollback guidance.",
    "tags": [
      "coding",
      "dependency",
      "upgrade"
    ],
    "tools": [
      "github.pr.read",
      "github.pr.comment",
      "repo.search"
    ],
    "triggerKind": "github"
  },
  {
    "id": "security-audit",
    "category": "coding",
    "categoryLabel": "Coding",
    "name": "Security Audit",
    "description": "Reviews a repository for common security issues and produces a prioritized fix list.",
    "tags": [
      "coding",
      "security",
      "audit"
    ],
    "tools": [
      "github.pr.read",
      "github.pr.comment",
      "repo.search"
    ],
    "triggerKind": "github"
  },
  {
    "id": "codegen-from-spec",
    "category": "coding",
    "categoryLabel": "Coding",
    "name": "Codegen From Spec",
    "description": "Turns a short feature specification into an implementation plan and code-generation checklist.",
    "tags": [
      "coding",
      "codegen",
      "spec"
    ],
    "tools": [
      "github.pr.read",
      "github.pr.comment",
      "repo.search"
    ],
    "triggerKind": "github"
  },
  {
    "id": "refactor-suggester",
    "category": "coding",
    "categoryLabel": "Coding",
    "name": "Refactor Suggester",
    "description": "Finds refactoring opportunities and proposes safe incremental changes.",
    "tags": [
      "coding",
      "refactor",
      "suggester"
    ],
    "tools": [
      "github.pr.read",
      "github.pr.comment",
      "repo.search"
    ],
    "triggerKind": "github"
  },
  {
    "id": "test-generator",
    "category": "coding",
    "categoryLabel": "Coding",
    "name": "Test Generator",
    "description": "Generates focused unit and integration test cases from a code or feature brief.",
    "tags": [
      "coding",
      "test",
      "generator"
    ],
    "tools": [
      "github.pr.read",
      "github.pr.comment",
      "repo.search"
    ],
    "triggerKind": "github"
  },
  {
    "id": "lint-explainer",
    "category": "coding",
    "categoryLabel": "Coding",
    "name": "Lint Explainer",
    "description": "Explains linter output and suggests a minimal patch strategy.",
    "tags": [
      "coding",
      "lint",
      "explainer"
    ],
    "tools": [
      "github.pr.read",
      "github.pr.comment",
      "repo.search"
    ],
    "triggerKind": "github"
  },
  {
    "id": "oncall-helper",
    "category": "coding",
    "categoryLabel": "Coding",
    "name": "Oncall Helper",
    "description": "Summarizes an engineering incident and prepares the handoff for the next responder.",
    "tags": [
      "coding",
      "oncall",
      "helper"
    ],
    "tools": [
      "github.pr.read",
      "github.pr.comment",
      "repo.search"
    ],
    "triggerKind": "github"
  },
  {
    "id": "ticket-triage",
    "category": "customer-support",
    "categoryLabel": "Customer support",
    "name": "Ticket Triage",
    "description": "Classifies support tickets by intent, urgency, account tier, and recommended queue.",
    "tags": [
      "customer-support",
      "ticket",
      "triage"
    ],
    "tools": [
      "zendesk.ticket.read",
      "zendesk.ticket.update",
      "kb.search"
    ],
    "triggerKind": "webhook"
  },
  {
    "id": "escalation-router",
    "category": "customer-support",
    "categoryLabel": "Customer support",
    "name": "Escalation Router",
    "description": "Routes high-risk customer conversations to the right escalation owner.",
    "tags": [
      "customer-support",
      "escalation",
      "router"
    ],
    "tools": [
      "zendesk.ticket.read",
      "zendesk.ticket.update",
      "kb.search"
    ],
    "triggerKind": "webhook"
  },
  {
    "id": "sentiment-aware-reply",
    "category": "customer-support",
    "categoryLabel": "Customer support",
    "name": "Sentiment Aware Reply",
    "description": "Drafts support replies that match sentiment while staying inside policy.",
    "tags": [
      "customer-support",
      "sentiment",
      "aware",
      "reply"
    ],
    "tools": [
      "zendesk.ticket.read",
      "zendesk.ticket.update",
      "kb.search"
    ],
    "triggerKind": "webhook"
  },
  {
    "id": "kb-grounded-answer",
    "category": "customer-support",
    "categoryLabel": "Customer support",
    "name": "Kb Grounded Answer",
    "description": "Answers customer questions using a knowledge-base lookup before drafting.",
    "tags": [
      "customer-support",
      "kb",
      "grounded",
      "answer"
    ],
    "tools": [
      "zendesk.ticket.read",
      "zendesk.ticket.update",
      "kb.search"
    ],
    "triggerKind": "webhook"
  },
  {
    "id": "multi-language-support",
    "category": "customer-support",
    "categoryLabel": "Customer support",
    "name": "Multi Language Support",
    "description": "Translates, classifies, and drafts support replies for multilingual queues.",
    "tags": [
      "customer-support",
      "multi",
      "language",
      "support"
    ],
    "tools": [
      "zendesk.ticket.read",
      "zendesk.ticket.update",
      "kb.search"
    ],
    "triggerKind": "webhook"
  },
  {
    "id": "paper-summary",
    "category": "research",
    "categoryLabel": "Research",
    "name": "Paper Summary",
    "description": "Summarizes an academic paper into claims, evidence, methods, and limitations.",
    "tags": [
      "research",
      "paper",
      "summary"
    ],
    "tools": [
      "fetch-url",
      "paper.search",
      "citation.lookup"
    ],
    "triggerKind": "cron"
  },
  {
    "id": "literature-review",
    "category": "research",
    "categoryLabel": "Research",
    "name": "Literature Review",
    "description": "Collects sources and synthesizes a literature review with open questions.",
    "tags": [
      "research",
      "literature",
      "review"
    ],
    "tools": [
      "fetch-url",
      "paper.search",
      "citation.lookup"
    ],
    "triggerKind": "cron"
  },
  {
    "id": "data-extractor",
    "category": "research",
    "categoryLabel": "Research",
    "name": "Data Extractor",
    "description": "Extracts structured facts from documents for downstream review.",
    "tags": [
      "research",
      "data",
      "extractor"
    ],
    "tools": [
      "fetch-url",
      "paper.search",
      "citation.lookup"
    ],
    "triggerKind": "cron"
  },
  {
    "id": "citation-checker",
    "category": "research",
    "categoryLabel": "Research",
    "name": "Citation Checker",
    "description": "Checks whether cited claims are supported by the provided source snippets.",
    "tags": [
      "research",
      "citation",
      "checker"
    ],
    "tools": [
      "fetch-url",
      "paper.search",
      "citation.lookup"
    ],
    "triggerKind": "cron"
  },
  {
    "id": "research-followups",
    "category": "research",
    "categoryLabel": "Research",
    "name": "Research Followups",
    "description": "Turns research notes into follow-up questions and next experiments.",
    "tags": [
      "research",
      "research",
      "followups"
    ],
    "tools": [
      "fetch-url",
      "paper.search",
      "citation.lookup"
    ],
    "triggerKind": "cron"
  },
  {
    "id": "agency-client-content-approval",
    "category": "marketing-content",
    "categoryLabel": "Marketing and content",
    "name": "Agency Client Content Approval",
    "description": "Drafts content, checks brand voice, and routes the result for client approval.",
    "tags": [
      "marketing-content",
      "agency",
      "client",
      "content",
      "approval"
    ],
    "tools": [
      "brand.kit.read",
      "cms.draft",
      "slack.send"
    ],
    "triggerKind": "slack"
  },
  {
    "id": "brand-voice-checker",
    "category": "marketing-content",
    "categoryLabel": "Marketing and content",
    "name": "Brand Voice Checker",
    "description": "Checks copy against tone, banned phrases, and brand requirements.",
    "tags": [
      "marketing-content",
      "brand",
      "voice",
      "checker"
    ],
    "tools": [
      "brand.kit.read",
      "cms.draft",
      "slack.send"
    ],
    "triggerKind": "slack"
  },
  {
    "id": "social-post-multi-channel",
    "category": "marketing-content",
    "categoryLabel": "Marketing and content",
    "name": "Social Post Multi Channel",
    "description": "Adapts one campaign brief into channel-specific posts.",
    "tags": [
      "marketing-content",
      "social",
      "post",
      "multi",
      "channel"
    ],
    "tools": [
      "brand.kit.read",
      "cms.draft",
      "slack.send"
    ],
    "triggerKind": "slack"
  },
  {
    "id": "blog-from-outline",
    "category": "marketing-content",
    "categoryLabel": "Marketing and content",
    "name": "Blog From Outline",
    "description": "Expands an outline into a blog draft with review checkpoints.",
    "tags": [
      "marketing-content",
      "blog",
      "outline"
    ],
    "tools": [
      "brand.kit.read",
      "cms.draft",
      "slack.send"
    ],
    "triggerKind": "slack"
  },
  {
    "id": "ad-copy-tester",
    "category": "marketing-content",
    "categoryLabel": "Marketing and content",
    "name": "Ad Copy Tester",
    "description": "Generates and compares multiple ad copy variants against a campaign goal.",
    "tags": [
      "marketing-content",
      "ad",
      "copy",
      "tester"
    ],
    "tools": [
      "brand.kit.read",
      "cms.draft",
      "slack.send"
    ],
    "triggerKind": "slack"
  },
  {
    "id": "healthcare-triage",
    "category": "healthcare",
    "categoryLabel": "Healthcare",
    "name": "Healthcare Triage",
    "description": "Classifies patient portal messages for urgency and routing without diagnosis.",
    "tags": [
      "healthcare",
      "healthcare",
      "triage"
    ],
    "tools": [
      "ehr.message.read",
      "pii.redact",
      "clinician.route"
    ],
    "triggerKind": "webhook"
  },
  {
    "id": "consent-checker",
    "category": "healthcare",
    "categoryLabel": "Healthcare",
    "name": "Consent Checker",
    "description": "Checks whether a workflow has consent before processing sensitive health data.",
    "tags": [
      "healthcare",
      "consent",
      "checker"
    ],
    "tools": [
      "ehr.message.read",
      "pii.redact",
      "clinician.route"
    ],
    "triggerKind": "webhook"
  },
  {
    "id": "hipaa-redact-and-summarize",
    "category": "healthcare",
    "categoryLabel": "Healthcare",
    "name": "HIPAA Redact And Summarize",
    "description": "Redacts HIPAA identifiers before summarizing clinical notes.",
    "tags": [
      "healthcare",
      "hipaa",
      "redact",
      "summarize"
    ],
    "tools": [
      "ehr.message.read",
      "pii.redact",
      "clinician.route"
    ],
    "triggerKind": "webhook"
  },
  {
    "id": "drug-interaction-lookup",
    "category": "healthcare",
    "categoryLabel": "Healthcare",
    "name": "Drug Interaction Lookup",
    "description": "Looks up potential interaction warnings and routes findings to a clinician.",
    "tags": [
      "healthcare",
      "drug",
      "interaction",
      "lookup"
    ],
    "tools": [
      "ehr.message.read",
      "pii.redact",
      "clinician.route"
    ],
    "triggerKind": "webhook"
  },
  {
    "id": "patient-portal-router",
    "category": "healthcare",
    "categoryLabel": "Healthcare",
    "name": "Patient Portal Router",
    "description": "Routes patient portal messages to scheduling, billing, nurse, or provider queues.",
    "tags": [
      "healthcare",
      "patient",
      "portal",
      "router"
    ],
    "tools": [
      "ehr.message.read",
      "pii.redact",
      "clinician.route"
    ],
    "triggerKind": "webhook"
  },
  {
    "id": "incident-summary",
    "category": "operations-sre",
    "categoryLabel": "Operations and SRE",
    "name": "Incident Summary",
    "description": "Summarizes incident signals, likely impact, and current mitigation status.",
    "tags": [
      "operations-sre",
      "incident",
      "summary"
    ],
    "tools": [
      "alerts.list",
      "runbook.read",
      "pagerduty.note"
    ],
    "triggerKind": "webhook"
  },
  {
    "id": "runbook-executor",
    "category": "operations-sre",
    "categoryLabel": "Operations and SRE",
    "name": "Runbook Executor",
    "description": "Runs a runbook step plan with human approval gates for risky actions.",
    "tags": [
      "operations-sre",
      "runbook",
      "executor"
    ],
    "tools": [
      "alerts.list",
      "runbook.read",
      "pagerduty.note"
    ],
    "triggerKind": "webhook"
  },
  {
    "id": "deploy-readiness",
    "category": "operations-sre",
    "categoryLabel": "Operations and SRE",
    "name": "Deploy Readiness",
    "description": "Checks deployment readiness against tests, incidents, flags, and rollback plan.",
    "tags": [
      "operations-sre",
      "deploy",
      "readiness"
    ],
    "tools": [
      "alerts.list",
      "runbook.read",
      "pagerduty.note"
    ],
    "triggerKind": "webhook"
  },
  {
    "id": "postmortem-drafter",
    "category": "operations-sre",
    "categoryLabel": "Operations and SRE",
    "name": "Postmortem Drafter",
    "description": "Drafts a postmortem from incident notes, timeline, and action items.",
    "tags": [
      "operations-sre",
      "postmortem",
      "drafter"
    ],
    "tools": [
      "alerts.list",
      "runbook.read",
      "pagerduty.note"
    ],
    "triggerKind": "webhook"
  },
  {
    "id": "oncall-handoff",
    "category": "operations-sre",
    "categoryLabel": "Operations and SRE",
    "name": "Oncall Handoff",
    "description": "Builds a concise on-call handoff from alerts, incidents, and pending tasks.",
    "tags": [
      "operations-sre",
      "oncall",
      "handoff"
    ],
    "tools": [
      "alerts.list",
      "runbook.read",
      "pagerduty.note"
    ],
    "triggerKind": "webhook"
  },
  {
    "id": "invoice-extractor",
    "category": "finance",
    "categoryLabel": "Finance",
    "name": "Invoice Extractor",
    "description": "Extracts invoice fields and routes exceptions to accounts payable.",
    "tags": [
      "finance",
      "invoice",
      "extractor"
    ],
    "tools": [
      "invoice.read",
      "erp.lookup",
      "approval.request"
    ],
    "triggerKind": "email"
  },
  {
    "id": "ap-router",
    "category": "finance",
    "categoryLabel": "Finance",
    "name": "AP Router",
    "description": "Routes accounts-payable requests by vendor, amount, and policy exceptions.",
    "tags": [
      "finance",
      "ap",
      "router"
    ],
    "tools": [
      "invoice.read",
      "erp.lookup",
      "approval.request"
    ],
    "triggerKind": "email"
  },
  {
    "id": "fraud-flagger",
    "category": "finance",
    "categoryLabel": "Finance",
    "name": "Fraud Flagger",
    "description": "Flags suspicious transactions for review using multiple independent checks.",
    "tags": [
      "finance",
      "fraud",
      "flagger"
    ],
    "tools": [
      "invoice.read",
      "erp.lookup",
      "approval.request"
    ],
    "triggerKind": "email"
  },
  {
    "id": "expense-classifier",
    "category": "finance",
    "categoryLabel": "Finance",
    "name": "Expense Classifier",
    "description": "Classifies expenses and identifies missing receipts or policy concerns.",
    "tags": [
      "finance",
      "expense",
      "classifier"
    ],
    "tools": [
      "invoice.read",
      "erp.lookup",
      "approval.request"
    ],
    "triggerKind": "email"
  },
  {
    "id": "monthly-close-checks",
    "category": "finance",
    "categoryLabel": "Finance",
    "name": "Monthly Close Checks",
    "description": "Coordinates monthly close checks across finance owners.",
    "tags": [
      "finance",
      "monthly",
      "close",
      "checks"
    ],
    "tools": [
      "invoice.read",
      "erp.lookup",
      "approval.request"
    ],
    "triggerKind": "email"
  },
  {
    "id": "csv-clean-and-load",
    "category": "data-pipelines",
    "categoryLabel": "Data pipelines",
    "name": "CSV Clean And Load",
    "description": "Cleans CSV input and prepares a validated load plan.",
    "tags": [
      "data-pipelines",
      "csv",
      "clean",
      "load"
    ],
    "tools": [
      "storage.read",
      "sql.preview",
      "warehouse.load"
    ],
    "triggerKind": "cdc"
  },
  {
    "id": "schema-discoverer",
    "category": "data-pipelines",
    "categoryLabel": "Data pipelines",
    "name": "Schema Discoverer",
    "description": "Infers a dataset schema and highlights quality issues.",
    "tags": [
      "data-pipelines",
      "schema",
      "discoverer"
    ],
    "tools": [
      "storage.read",
      "sql.preview",
      "warehouse.load"
    ],
    "triggerKind": "cdc"
  },
  {
    "id": "anomaly-flagger",
    "category": "data-pipelines",
    "categoryLabel": "Data pipelines",
    "name": "Anomaly Flagger",
    "description": "Flags anomalies in metrics or tabular records for review.",
    "tags": [
      "data-pipelines",
      "anomaly",
      "flagger"
    ],
    "tools": [
      "storage.read",
      "sql.preview",
      "warehouse.load"
    ],
    "triggerKind": "cdc"
  },
  {
    "id": "sql-from-natural-language",
    "category": "data-pipelines",
    "categoryLabel": "Data pipelines",
    "name": "SQL From Natural Language",
    "description": "Drafts SQL from a natural-language request and asks for approval before execution.",
    "tags": [
      "data-pipelines",
      "sql",
      "natural",
      "language"
    ],
    "tools": [
      "storage.read",
      "sql.preview",
      "warehouse.load"
    ],
    "triggerKind": "cdc"
  },
  {
    "id": "dashboard-explainer",
    "category": "data-pipelines",
    "categoryLabel": "Data pipelines",
    "name": "Dashboard Explainer",
    "description": "Explains dashboard changes and identifies likely drivers.",
    "tags": [
      "data-pipelines",
      "dashboard",
      "explainer"
    ],
    "tools": [
      "storage.read",
      "sql.preview",
      "warehouse.load"
    ],
    "triggerKind": "cdc"
  },
  {
    "id": "email-triage",
    "category": "personal-productivity",
    "categoryLabel": "Personal productivity",
    "name": "Email Triage",
    "description": "Classifies email, drafts replies, and creates follow-up tasks.",
    "tags": [
      "personal-productivity",
      "email",
      "triage"
    ],
    "tools": [
      "gmail.search",
      "calendar.read",
      "tasks.create"
    ],
    "triggerKind": "email"
  },
  {
    "id": "calendar-conflict-resolver",
    "category": "personal-productivity",
    "categoryLabel": "Personal productivity",
    "name": "Calendar Conflict Resolver",
    "description": "Finds meeting conflicts and proposes rescheduling options.",
    "tags": [
      "personal-productivity",
      "calendar",
      "conflict",
      "resolver"
    ],
    "tools": [
      "gmail.search",
      "calendar.read",
      "tasks.create"
    ],
    "triggerKind": "email"
  },
  {
    "id": "meeting-notes",
    "category": "personal-productivity",
    "categoryLabel": "Personal productivity",
    "name": "Meeting Notes",
    "description": "Turns transcript notes into decisions, action items, and follow-ups.",
    "tags": [
      "personal-productivity",
      "meeting",
      "notes"
    ],
    "tools": [
      "gmail.search",
      "calendar.read",
      "tasks.create"
    ],
    "triggerKind": "email"
  },
  {
    "id": "daily-summary",
    "category": "personal-productivity",
    "categoryLabel": "Personal productivity",
    "name": "Daily Summary",
    "description": "Summarizes the day across messages, meetings, and tasks.",
    "tags": [
      "personal-productivity",
      "daily",
      "summary"
    ],
    "tools": [
      "gmail.search",
      "calendar.read",
      "tasks.create"
    ],
    "triggerKind": "email"
  },
  {
    "id": "weekly-review",
    "category": "personal-productivity",
    "categoryLabel": "Personal productivity",
    "name": "Weekly Review",
    "description": "Builds a weekly review with wins, risks, and next priorities.",
    "tags": [
      "personal-productivity",
      "weekly",
      "review"
    ],
    "tools": [
      "gmail.search",
      "calendar.read",
      "tasks.create"
    ],
    "triggerKind": "email"
  },
  {
    "id": "3-way-compare-models",
    "category": "compare-vote",
    "categoryLabel": "Compare and vote",
    "name": "Three Way Compare Models",
    "description": "Runs three model agents on the same task and compares the outputs.",
    "tags": [
      "compare-vote",
      "3",
      "way",
      "compare",
      "models"
    ],
    "tools": [
      "fetch-url",
      "scratchpad.write",
      "report.create"
    ],
    "triggerKind": "webhook"
  },
  {
    "id": "debate-investment-thesis",
    "category": "compare-vote",
    "categoryLabel": "Compare and vote",
    "name": "Debate Investment Thesis",
    "description": "Runs a pro/con debate with a judge for an investment thesis.",
    "tags": [
      "compare-vote",
      "debate",
      "investment",
      "thesis"
    ],
    "tools": [
      "fetch-url",
      "scratchpad.write",
      "report.create"
    ],
    "triggerKind": "webhook"
  },
  {
    "id": "auction-task-bidder",
    "category": "compare-vote",
    "categoryLabel": "Compare and vote",
    "name": "Auction Task Bidder",
    "description": "Lets agents bid on a task by confidence, cost, and speed.",
    "tags": [
      "compare-vote",
      "auction",
      "task",
      "bidder"
    ],
    "tools": [
      "fetch-url",
      "scratchpad.write",
      "report.create"
    ],
    "triggerKind": "webhook"
  },
  {
    "id": "vote-content-policy",
    "category": "compare-vote",
    "categoryLabel": "Compare and vote",
    "name": "Vote Content Policy",
    "description": "Uses odd-numbered voting agents to classify content policy decisions.",
    "tags": [
      "compare-vote",
      "vote",
      "content",
      "policy"
    ],
    "tools": [
      "fetch-url",
      "scratchpad.write",
      "report.create"
    ],
    "triggerKind": "webhook"
  },
  {
    "id": "blackboard-research-swarm",
    "category": "compare-vote",
    "categoryLabel": "Compare and vote",
    "name": "Blackboard Research Swarm",
    "description": "Coordinates a research swarm through a shared blackboard scratchpad.",
    "tags": [
      "compare-vote",
      "blackboard",
      "research",
      "swarm"
    ],
    "tools": [
      "fetch-url",
      "scratchpad.write",
      "report.create"
    ],
    "triggerKind": "webhook"
  }
] as const satisfies readonly TemplateSpec[]

const agentId = (id: string, suffix: string): string => `${id.slice(0, 46)}-${suffix}`.replace(/^-+|-+$/g, '')

const makeAgent = (spec: TemplateSpec, suffix: 'lead' | 'reviewer' | 'judge') =>
  parseAgentConfig({
    id: agentId(spec.id, suffix),
    name: `${spec.name} ${suffix === 'lead' ? 'Lead' : suffix === 'reviewer' ? 'Reviewer' : 'Judge'}`,
    systemPrompt: `${spec.description} Act as the ${suffix} agent. Keep outputs structured, concise, and auditable.`,
    model: { provider: 'openai', model: 'gpt-5.4-mini', temperature: suffix === 'judge' ? 0.1 : 0.2 },
    tools: [...spec.tools],
    tags: [spec.category, suffix],
  })

const makeFlow = (spec: TemplateSpec) => {
  const lead = agentId(spec.id, 'lead')
  const reviewer = agentId(spec.id, 'reviewer')
  const judge = agentId(spec.id, 'judge')
  if (spec.category === 'compare-vote') {
    if (spec.id.startsWith('debate')) {
      return parseFlowConfig({ id: `${spec.id}-flow`, name: `${spec.name} Flow`, entry: 'debate', nodes: [{ id: 'debate', kind: 'debate', proponent: lead, opponent: reviewer, judge, topic: spec.name, rounds: 2 }, { id: 'report', kind: 'tool', tool: 'report.create' }], edges: [{ from: 'debate', to: 'report' }], tags: [spec.category] })
    }
    if (spec.id.startsWith('auction')) {
      return parseFlowConfig({ id: `${spec.id}-flow`, name: `${spec.name} Flow`, entry: 'auction', nodes: [{ id: 'auction', kind: 'auction', bidders: [lead, reviewer], task: spec.name, bidCriteria: 'highest-confidence' }, { id: 'report', kind: 'tool', tool: 'report.create' }], edges: [{ from: 'auction', to: 'report' }], tags: [spec.category] })
    }
    if (spec.id.startsWith('vote')) {
      return parseFlowConfig({ id: `${spec.id}-flow`, name: `${spec.name} Flow`, entry: 'vote', nodes: [{ id: 'vote', kind: 'vote', agents: [lead, reviewer, judge], ballot: { mode: 'majority' }, outputType: 'classification' }, { id: 'report', kind: 'tool', tool: 'report.create' }], edges: [{ from: 'vote', to: 'report' }], tags: [spec.category] })
    }
    if (spec.id.startsWith('blackboard')) {
      return parseFlowConfig({ id: `${spec.id}-flow`, name: `${spec.name} Flow`, entry: 'swarm', nodes: [{ id: 'swarm', kind: 'blackboard', agents: [lead, reviewer, judge], scratchpad: { kind: 'in-memory' }, schedule: { mode: 'round-robin' }, termination: { mode: 'rounds', n: 3 } }, { id: 'report', kind: 'tool', tool: 'report.create' }], edges: [{ from: 'swarm', to: 'report' }], tags: [spec.category] })
    }
    return parseFlowConfig({ id: `${spec.id}-flow`, name: `${spec.name} Flow`, entry: 'compare', nodes: [{ id: 'compare', kind: 'compare', agents: [lead, reviewer, judge], selection: { mode: 'judge', judgeAgent: judge, criteria: 'Completeness, correctness, and actionability.' } }, { id: 'report', kind: 'tool', tool: 'report.create' }], edges: [{ from: 'compare', to: 'report' }], tags: [spec.category] })
  }
  const needsApproval = ['healthcare', 'finance'].includes(spec.category) || spec.id.includes('approval') || spec.id.includes('deploy') || spec.id.includes('runbook')
  return parseFlowConfig({
    id: `${spec.id}-flow`,
    name: `${spec.name} Flow`,
    entry: 'ingest',
    nodes: [
      { id: 'ingest', kind: 'tool', tool: spec.tools[0] ?? 'fetch-url' },
      { id: 'draft', kind: 'agent', agent: lead },
      { id: 'review', kind: 'agent', agent: reviewer },
      ...(needsApproval ? [{ id: 'approval', kind: 'human', prompt: `Approve ${spec.name} before external action?`, approvers: ['owner'], quorum: 1 } as const] : []),
      { id: 'publish', kind: 'tool', tool: spec.tools[2] ?? spec.tools[0] ?? 'report.create' },
    ],
    edges: [
      { from: 'ingest', to: 'draft' },
      { from: 'draft', to: 'review' },
      ...(needsApproval ? [{ from: 'review', to: 'approval' }, { from: 'approval', to: 'publish' }] : [{ from: 'review', to: 'publish' }]),
    ],
    tags: [spec.category],
  })
}

const metadataFor = (spec: TemplateSpec): TemplateMetadata => ({
  id: spec.id,
  name: spec.name,
  intent: spec.description,
  category: spec.category,
  tags: [...spec.tags],
  estimatedCostUsd: 0.25,
  estimatedTokens: 18000,
  primaryAgents: [agentId(spec.id, 'lead'), agentId(spec.id, 'reviewer')],
  primaryTools: [...spec.tools],
  runModesSupported: ['dry_run', 'preview'],
  triggerKind: spec.triggerKind,
  stability: 'ready',
})

export const TEMPLATES: readonly TemplateMetadata[] = templateSpecs.map(metadataFor)

export const builtInTemplates: readonly Template[] = templateSpecs.map((spec) => ({
  id: spec.id,
  name: spec.name,
  description: spec.description,
  category: spec.category,
  tags: spec.tags,
  difficulty: spec.category === 'compare-vote' ? 'advanced' : 'intermediate',
  version: '1.0.0',
  metadata: metadataFor(spec),
  agents: [makeAgent(spec, 'lead'), makeAgent(spec, 'reviewer'), makeAgent(spec, 'judge')],
  flows: [makeFlow(spec)],
}))
