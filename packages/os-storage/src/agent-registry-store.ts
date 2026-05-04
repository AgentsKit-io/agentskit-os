// JSONL-backed RegistryStore. Append-only event log, JSON-encoded
// snapshot of the current entry table. The sqlite mirror is a future
// optimization; jsonl is the authoritative source for now and is also
// the audit log mirror per ADR-0008.

import { join } from 'node:path'
import {
  parseAgentRegistryEntry,
  parseAgentLifecycleEvent,
  type AgentRegistryEntry,
  type AgentLifecycleEvent,
  type RegistryStore,
} from '@agentskit/os-core'
import { type FileSystem, nodeFs } from './fs-utils.js'

export type FileRegistryStoreOptions = {
  /** Directory under which registry.jsonl + events.jsonl will be written. */
  readonly dir: string
  readonly fs?: FileSystem
}

const ENTRIES_FILE = 'registry.jsonl'
const EVENTS_FILE = 'events.jsonl'

export class FileRegistryStore implements RegistryStore {
  private constructor(
    private readonly dir: string,
    private readonly fs: FileSystem,
  ) {}

  static async create(options: FileRegistryStoreOptions): Promise<FileRegistryStore> {
    const fs = options.fs ?? (await nodeFs())
    await fs.mkdir(options.dir, { recursive: true })
    return new FileRegistryStore(options.dir, fs)
  }

  private get entriesPath(): string {
    return join(this.dir, ENTRIES_FILE)
  }

  private get eventsPath(): string {
    return join(this.dir, EVENTS_FILE)
  }

  private async readEntries(): Promise<AgentRegistryEntry[]> {
    if (!(await this.fs.exists(this.entriesPath))) return []
    const raw = await this.fs.readFile(this.entriesPath, 'utf8')
    const entries = new Map<string, AgentRegistryEntry>()
    for (const line of raw.split('\n')) {
      if (!line.trim()) continue
      try {
        const parsed = parseAgentRegistryEntry(JSON.parse(line))
        entries.set(parsed.agentId, parsed)
      } catch {
        // skip corrupt lines; don't fail the whole read
      }
    }
    return [...entries.values()]
  }

  async get(agentId: string): Promise<AgentRegistryEntry | undefined> {
    const all = await this.readEntries()
    return all.find((e) => e.agentId === agentId)
  }

  async list(): Promise<readonly AgentRegistryEntry[]> {
    return this.readEntries()
  }

  async upsert(entry: AgentRegistryEntry): Promise<AgentRegistryEntry> {
    parseAgentRegistryEntry(entry)
    await this.fs.appendFile(this.entriesPath, `${JSON.stringify(entry)}\n`, 'utf8')
    return entry
  }

  async appendEvent(event: AgentLifecycleEvent): Promise<void> {
    parseAgentLifecycleEvent(event)
    await this.fs.appendFile(this.eventsPath, `${JSON.stringify(event)}\n`, 'utf8')
  }

  async readEvents(agentId: string): Promise<readonly AgentLifecycleEvent[]> {
    if (!(await this.fs.exists(this.eventsPath))) return []
    const raw = await this.fs.readFile(this.eventsPath, 'utf8')
    const events: AgentLifecycleEvent[] = []
    for (const line of raw.split('\n')) {
      if (!line.trim()) continue
      try {
        const parsed = parseAgentLifecycleEvent(JSON.parse(line))
        if (parsed.agentId === agentId) events.push(parsed)
      } catch {
        // skip
      }
    }
    events.sort((a, b) => a.at.localeCompare(b.at))
    return events
  }
}
