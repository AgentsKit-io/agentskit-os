/**
 * Example library — static data.
 *
 * 12 curated examples covering the canonical intent categories.
 * templateId values correspond to real template ids in @agentskit/os-templates.
 * null templateId = "coming soon".
 *
 * Real template ids available:
 *   pr-review, marketing-3way, research-summary, support-triage,
 *   clinical-consensus
 */

import type { Example } from './example-types'

export const EXAMPLES: readonly Example[] = [
  // -------------------------------------------------------------------------
  // Intent: Triage support tickets
  // -------------------------------------------------------------------------
  {
    id: 'triage-support-tickets-basic',
    intent: 'Triage support tickets',
    title: 'Support Ticket Classifier',
    description:
      'Automatically classify incoming support tickets as billing, technical, or escalation and route them to the right team. Includes a human-in-the-loop gate for escalations.',
    templateId: 'support-triage',
    tags: ['support', 'classification', 'routing', 'hitl'],
    estCostUsd: 0.003,
    estTokens: 1200,
  },
  {
    id: 'triage-support-tickets-sentiment',
    intent: 'Triage support tickets',
    title: 'Ticket Sentiment + Priority Scorer',
    description:
      'Combines sentiment analysis with urgency detection to produce a priority score (P0–P3). Helps support leads focus on the highest-impact tickets first.',
    templateId: null,
    tags: ['support', 'sentiment', 'priority', 'nlp'],
    estCostUsd: 0.005,
    estTokens: 1800,
  },

  // -------------------------------------------------------------------------
  // Intent: Summarize a research paper
  // -------------------------------------------------------------------------
  {
    id: 'summarize-research-paper-structured',
    intent: 'Summarize a research paper',
    title: 'Research Paper Summary',
    description:
      'Extracts abstract, key findings, methodology, and limitations from an academic PDF, then produces a structured one-page summary ready for a Notion database.',
    templateId: 'research-summary',
    tags: ['research', 'summarization', 'pdf', 'academia'],
    estCostUsd: 0.012,
    estTokens: 5000,
  },
  {
    id: 'summarize-research-paper-comparative',
    intent: 'Summarize a research paper',
    title: 'Multi-Paper Comparison',
    description:
      'Compares two or three papers on the same topic, surfaces agreements and contradictions, and generates a comparative table for quick literature review.',
    templateId: null,
    tags: ['research', 'comparison', 'literature-review'],
    estCostUsd: 0.025,
    estTokens: 9000,
  },

  // -------------------------------------------------------------------------
  // Intent: Generate a PR review
  // -------------------------------------------------------------------------
  {
    id: 'generate-pr-review-standard',
    intent: 'Generate a PR review',
    title: 'GitHub PR Reviewer',
    description:
      'Fetches a pull request diff, runs a reviewer agent that checks for clarity, correctness, and convention adherence, then posts a structured comment back to GitHub.',
    templateId: 'pr-review',
    tags: ['github', 'code-review', 'automation', 'webhook'],
    estCostUsd: 0.008,
    estTokens: 3200,
  },
  {
    id: 'generate-pr-review-3way',
    intent: 'Generate a PR review',
    title: '3-Way Consensus PR Review',
    description:
      'Three independent reviewer agents with different personas (security, performance, UX) each review the PR and vote. A synthesiser merges their verdicts into one final comment.',
    templateId: null,
    tags: ['github', 'code-review', 'multi-agent', 'consensus'],
    estCostUsd: 0.022,
    estTokens: 8500,
  },

  // -------------------------------------------------------------------------
  // Intent: Compare two LLMs on the same prompt
  // -------------------------------------------------------------------------
  {
    id: 'compare-llms-side-by-side',
    intent: 'Compare two LLMs on the same prompt',
    title: 'LLM Side-by-Side Benchmark',
    description:
      'Sends the same prompt to two configurable LLM providers in parallel, collects latency, cost, and response quality scores, and renders a comparison report.',
    templateId: 'marketing-3way',
    tags: ['benchmark', 'multi-llm', 'evaluation', 'parallel'],
    estCostUsd: 0.018,
    estTokens: 6500,
  },
  {
    id: 'compare-llms-regression',
    intent: 'Compare two LLMs on the same prompt',
    title: 'Regression Suite Across Models',
    description:
      'Runs a predefined set of golden prompts against two model versions, scores each output with a judge model, and flags regressions automatically.',
    templateId: null,
    tags: ['benchmark', 'regression', 'evaluation', 'judge'],
    estCostUsd: 0.04,
    estTokens: 15000,
  },

  // -------------------------------------------------------------------------
  // Intent: Run a periodic data pipeline
  // -------------------------------------------------------------------------
  {
    id: 'periodic-data-pipeline-etl',
    intent: 'Run a periodic data pipeline',
    title: 'Scheduled ETL Pipeline',
    description:
      'Pulls records from a configured source (CSV, API, or database), transforms them with an agent, and writes cleaned results to a target destination on a cron schedule.',
    templateId: null,
    tags: ['pipeline', 'etl', 'cron', 'automation'],
    estCostUsd: 0.015,
    estTokens: 5500,
  },
  {
    id: 'periodic-data-pipeline-digest',
    intent: 'Run a periodic data pipeline',
    title: 'Daily Digest Generator',
    description:
      'Aggregates metrics from multiple sources every morning, summarises key changes with an agent, and delivers a Slack or email digest to your team.',
    templateId: null,
    tags: ['pipeline', 'digest', 'slack', 'schedule'],
    estCostUsd: 0.007,
    estTokens: 2800,
  },

  // -------------------------------------------------------------------------
  // Intent: Classify customer feedback
  // -------------------------------------------------------------------------
  {
    id: 'classify-customer-feedback-nps',
    intent: 'Classify customer feedback',
    title: 'NPS Comment Classifier',
    description:
      'Reads NPS survey free-text responses, classifies each as a product issue, praise, feature request, or churn risk, and writes labelled rows back to a spreadsheet.',
    templateId: 'support-triage',
    tags: ['feedback', 'classification', 'nps', 'spreadsheet'],
    estCostUsd: 0.004,
    estTokens: 1600,
  },
  {
    id: 'classify-customer-feedback-review',
    intent: 'Classify customer feedback',
    title: 'App Store Review Analyser',
    description:
      'Fetches recent App Store or Google Play reviews, classifies themes (UI, performance, pricing, bugs), and produces a weekly sentiment trend report.',
    templateId: null,
    tags: ['feedback', 'reviews', 'sentiment', 'trends'],
    estCostUsd: 0.009,
    estTokens: 3500,
  },
]

/** All distinct intent categories present in EXAMPLES. */
export const ALL_INTENTS: readonly string[] = [
  ...new Set(EXAMPLES.map((e) => e.intent)),
]
