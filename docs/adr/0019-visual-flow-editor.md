# ADR-0019 — Visual Flow Editor Architecture (React Flow + os-flow Integration)

- **Status:** Proposed
- **Date:** 2026-05-04
- **Deciders:** @EmersonBraun

## Context

M3 on the roadmap ("Flow Orchestrator") calls for a visual flow editor in the desktop shell that lets users author, debug, and replay agent flows without hand-writing YAML or TypeScript. The flow contract is already established: `FlowConfig` (Zod schema in `packages/os-core/src/schema/flow.ts`) defines nodes, edges, entry point, retry policy, and all multi-agent pattern kinds from RFC-0003. The runtime (`packages/os-flow`) executes that contract and emits per-node events that the editor must reflect live.

**Why a visual editor** — Most agent orchestrators expose a text-based configuration and leave visualisation as a third-party concern. A first-class visual editor closes the gap between "author a flow" and "understand what is happening", which is a core differentiator. Visual authoring also lowers the barrier for non-engineer stakeholders who need to inspect, approve, or adjust flows.

**Integration constraints**

- The editor must round-trip losslessly with `FlowConfig`. Any flow that can be expressed in YAML or TypeScript must be loadable into the editor and re-serialisable byte-equivalently (after canonical formatting via `parseFlowConfig`). The Zod schema is the contract; the editor may not invent fields outside it.
- All ten node kinds must be supported at launch: `agent`, `tool`, `human`, `condition`, `parallel`, `compare`, `vote`, `debate`, `auction`, `blackboard` (RFC-0003 added the last five).
- Run modes defined in ADR-0009 (`real`, `preview`, `dry_run`, `replay`, `simulate`, `deterministic`) must be honoured visually. The editor changes behaviour based on mode: mutations are disabled in `replay`, live node state is highlighted in `debug` (which maps to `real` or `preview` runs with step-through controls active).
- The editor lives in `apps/desktop` as a React component rendered inside the Tauri 2 WebView (ADR-0018). It communicates with the sidecar exclusively via Tauri IPC; it never calls `runFlow` directly.
- Plugin authors must be able to register custom node kinds via the existing extension-point catalog (ADR-0012 `flow-node-kind` extension point) and have them render correctly in the editor without modifying core.

**Why React Flow (xyflow) over alternatives** — see §5.

## Decision

### 3.1 Library choice

Use **React Flow (xyflow) v12** as the canvas engine. Justification:

- Actively maintained (xyflow organisation, commercial backing, regular releases).
- Accessibility built in: keyboard navigation, ARIA roles on nodes and edges, focus management.
- Custom node renderers via the `nodeTypes` prop — one React component per `FlowNode.kind`.
- Multiple edge routing strategies (straight, bezier, step, smoothstep) with custom edge components.
- Built-in viewport controls (pan, zoom, fit-view), minimap, and background grid.
- MIT license — no CLA or commercial restriction for embedding in an OSS desktop app.
- Ecosystem fit: the rest of `packages/os-desktop` is React + Tailwind + shadcn (ADR-0018 §3.5); no new UI paradigm is introduced.

The library is consumed as a production dependency of `packages/os-desktop`. It is **not** exposed in `packages/os-ui` or any public package, keeping `@agentskit/os-core` and `@agentskit/os-flow` free of UI dependencies.

### 3.2 State model

`FlowConfig` (Zod) is the **canonical source of truth**. The React Flow internal node/edge arrays are a derivation — they are computed from `FlowConfig` on every load and on every external change, and they serialize back to `FlowConfig` on every user mutation.

```
FlowConfig (Zod)
     │  ↑
     │  │  bidirectional converter (pure, no React Flow imports)
     ▼  │
ReactFlowNodes + ReactFlowEdges  ←──  User interactions
```

The converter (`packages/os-desktop/src/flow-editor/converter.ts`) is framework-agnostic: it imports only `@agentskit/os-core` types and returns plain objects. This allows it to be tested in isolation from the React component tree.

**Layout metadata** — React Flow requires `x`/`y` position per node. These coordinates are editor-local and are not part of the `FlowConfig` contract. They are stored in a sidecar file alongside the flow definition:

```
.agentskitos/
  flows/
    <flow-id>.yaml          ← FlowConfig (canonical)
    <flow-id>.layout.json   ← { nodePositions: Record<NodeId, {x, y}> }
```

The layout file is gitignore-able. When absent, the editor runs an automatic layout algorithm (ELK via `@dagrejs/dagre` or equivalent) to derive initial positions.

**Reducer pattern** — the editor's React state is managed via a `useReducer` hook. Every action that mutates the flow (add node, delete edge, update node props) dispatches through the reducer, which:

1. Applies the change to a working `FlowConfig` draft.
2. Runs `parseFlowConfig` (throws on schema violation — surfaced as an inline error banner, not a crash).
3. On success, updates the React Flow node/edge arrays.
4. Pushes the validated `FlowConfig` to the undo stack.
5. Schedules a debounced persist call via the sidecar IPC.

### 3.3 Custom node renderers

One React component per `FlowNode.kind`. All components live in `packages/os-desktop/src/flow-editor/nodes/`.

| Kind | Visual treatment |
|---|---|
| `agent` | Rounded rectangle. Agent name + model badge. Token/cost annotation in debug. |
| `tool` | Rectangle with wrench icon. Tool name + side-effect tier (read/write/destructive) shown as pill. |
| `human` | Rectangle with "approval gate" ring (double border). Quorum shown as badge (e.g. "2P" for quorum=2). Pulses in debug mode when pending. |
| `condition` | Diamond shape. Expression preview truncated to 40 chars. |
| `parallel` | Fork icon left, join icon right. Branch count badge. |
| `compare` | Multi-lane rectangle. Agent lane count shown. Selection mode badge. |
| `vote` | Ballot box icon. Agent count, ballot mode, onTie strategy shown. |
| `debate` | Two-column with judge row at bottom. Round count badge. |
| `auction` | Gavel icon. Bidder count, bid criteria shown. |
| `blackboard` | Chalkboard icon. Agent count, scratchpad kind, termination mode shown. |

All node components accept a `selected` prop (from React Flow) and apply a focus ring consistent with the `os-ui` design token `--color-accent`.

**Plugin-contributed node kinds** are registered via the ADR-0012 `flow-node-kind` extension point. The plugin supplies a React component (loaded via the sidecar plugin manifest, bundled as a Tauri sidecar resource). The editor's `nodeTypes` map is built at runtime from the built-in set plus any loaded plugin registrations. Plugin node components must implement the `FlowNodeRendererProps` interface exported from `packages/os-desktop/src/flow-editor/types.ts`:

```ts
export type FlowNodeRendererProps<T extends FlowNode = FlowNode> = {
  data: T
  selected: boolean
  mode: EditorMode
}
```

### 3.4 Edge model

`FlowEdge` (`from`, `to`, `on`) maps directly to a React Flow edge. The `on` field drives visual encoding:

| `on` value | Edge color | Label |
|---|---|---|
| `always` | `--color-ink-muted` (grey) | none |
| `success` | `--color-accent` (brand green) | none |
| `failure` | destructive red | "failure" |
| `true` | conditional blue | "true" |
| `false` | conditional amber | "false" |

Conditional edges (`true` / `false`) render an inline floating label at the midpoint of the edge. Edge routing defaults to `smoothstep`. Users can drag edge waypoints in edit mode; waypoint coordinates are stored in the layout sidecar, not in `FlowConfig`.

### 3.5 Three editor modes

The editor exposes three modes via a `mode` prop (type `EditorMode = 'edit' | 'debug' | 'replay'`).

**Edit mode** — Full mutation. Users can:
- Drag nodes to reposition (layout sidecar updated).
- Draw edges from source handle to target handle (new `FlowEdge` added to `FlowConfig`).
- Delete nodes and edges (keyboard `Delete`/`Backspace` or context menu).
- Open the inspector panel (§3.9) to edit node properties.
- Rename the flow, add/remove tags.

Structural constraints from `FlowConfig` are enforced in real time. Adding an edge that would create a cycle is rejected with an inline error. Deleting the entry node prompts the user to nominate a replacement.

**Debug mode** — Read-only graph structure. The editor subscribes to the `os-flow` event stream forwarded through the sidecar IPC channel (`event` channel per ADR-0018 §3.2). Events (`node:start`, `node:end`) highlight nodes in real time:

- Currently-running node: pulsing accent ring.
- Completed node (success): faint green fill.
- Failed node: red fill with error code tooltip.
- Enabled-but-not-yet-run nodes: no special treatment.

Toolbar provides step-through controls: **Run**, **Pause**, **Step**, **Cancel**. Clicking a node in debug mode opens a context menu:
- "Inject mock result" — sends a fixture via IPC; the sidecar treats it as the node's outcome (supported only in `dry_run` or `simulate` run modes, per ADR-0009).
- "Pause after this node" — sets a breakpoint; the runner pauses when the node completes.

**Replay mode** — Read-only. Driven by a `RunSnapshot` object (from `packages/os-flow/src/snapshot.ts`). A time-scrubber below the canvas lets the user step forward and backward through `executedOrder`. At each position, completed nodes are highlighted and outcomes displayed in the inspector.

"Branch from here" button is shown in the toolbar. Clicking it:
1. Calls `branchFromSnapshot({ snapshot, flow, branchPoint: selectedNodeId })` (from `packages/os-flow/src/branch.ts`).
2. Opens a new editor tab seeded with the resulting `BranchResult`, pre-populated with `seedOutcomes` so the new run resumes from the branch point.

### 3.6 Round-trip invariant

The conversion between `FlowConfig` and the React Flow representation is pure and tested as a contract invariant in `packages/os-flow`:

```
parseFlowConfig(serialize(fromReactFlow(toReactFlow(flowConfig)))) deep-equals flowConfig
```

Key rules:
- `toReactFlow(flowConfig)` reads `FlowConfig` + layout sidecar and produces `{ nodes: RFNode[], edges: RFEdge[] }`.
- `fromReactFlow(nodes, edges, meta)` reconstructs a `FlowConfig`-shaped object; positions are stripped to the sidecar.
- Serialization runs `parseFlowConfig` before persisting — any violation surfaces as a user-visible error, never silently written.
- YAML and TypeScript round-trips add one layer above (`js-yaml` / `tsx` evaluation) but the Zod parse is the same gate.
- The canonical serializer produces deterministic field ordering so that "edit in GUI then save" produces byte-equivalent YAML to "edit in YAML directly" (after `prettier` formatting, which is part of the canonical serializer pipeline).

No React Flow import appears in `converter.ts`. The converter may be imported in Node tests without a DOM.

### 3.7 Performance budget

The editor must render at 60 fps on Apple Silicon M1 with:

- Up to **500 nodes** and **2000 edges** in the viewport.

Beyond that threshold the editor activates React Flow's built-in node virtualization (only nodes within the viewport bounding box are rendered). The minimap remains always-on for orientation.

At 500+ nodes, the inspector panel becomes the primary interaction surface — clicking a node in the minimap opens its inspector directly rather than panning to it.

Performance is measured in CI via a Playwright headless benchmark (`apps/desktop/e2e/perf/flow-editor-large.spec.ts`) that loads a synthetic 500-node flow and asserts `p95 frame time < 16.7 ms`.

### 3.8 Persistence and undo

Every mutation dispatches through the reducer and produces a validated `FlowConfig`. The undo stack is:

- A `FlowConfig[]` array capped at **200 entries**.
- Each entry is Zod-validated before push; invalid intermediates are never stored.
- Persisted to `.agentskitos/flow-edits/<flow-id>.undo.json` so undo history survives a shell restart.
- The undo file is not committed to version control (added to `.gitignore` by the workspace initializer).

Undo/redo binds to platform-standard keys (`Cmd+Z` / `Cmd+Shift+Z` on macOS, `Ctrl+Z` / `Ctrl+Y` on Windows/Linux) via the command palette's key binding layer (ADR-0018 §3.6 hot-reload note).

**Autosave** — mutations are debounced 800 ms and then sent to the sidecar via the `request` IPC channel (`flow.save` method). The sidecar writes the canonical YAML atomically (write to `<file>.tmp`, then `fs.rename`). In-flight saves are indicated by a spinner in the editor toolbar.

### 3.9 Inspector panel

The inspector is a right-side panel (300 px fixed width, collapsible). It renders per-kind form components:

| Kind | Inspector shows |
|---|---|
| All | `id` (read-only), `label`, `retry` policy, `timeoutMs`. |
| `agent` | `agent` slug (dropdown from workspace registry), `input` key-value editor. |
| `tool` | `tool` name, `input` key-value editor, side-effect tier label (from tool manifest). |
| `human` | `prompt` textarea, `approvers` multi-select, `quorum` number input. |
| `condition` | `expression` code editor (single-line, JS-like syntax). |
| `parallel` | `branches` multi-select (node id picker). |
| `compare` | `agents` multi-select, `selection` mode picker + sub-fields, `isolation` toggle. |
| `vote` | `agents` multi-select (odd count enforced), `ballot` mode, `onTie`, `judgeAgent`. |
| `debate` | `proponent`, `opponent`, `judge` pickers, `topic`, `rounds`, `format`, `earlyExit`. |
| `auction` | `bidders` multi-select, `bidCriteria`, `reservePrice`, `fallback`, `timeout`. |
| `blackboard` | `agents` multi-select, `scratchpad` kind, `schedule` mode, `termination` mode. |

Inspector writes go through the reducer. Validation errors surface inline next to the offending field (Zod `ZodError` path → field highlight).

Edge selection shows the `on` value as a dropdown and allows changing edge semantics.

### 3.10 HITL representation

`human` nodes are visually distinct:

- Rendered with a double-border "approval gate" ring in all three modes.
- If `quorum > 1`, a badge (e.g. "2P", "3P") is shown in the top-right corner of the node.
- In debug mode, a `human` node whose outcome is `{ kind: 'paused', reason: 'hitl' }` pulses — the border animates with a slow glow using the `--color-accent` token.
- When the sidecar emits a `hitl.pending` event (forwarded from `os-flow`), the editor opens an approval overlay: the node expands in place to show the `prompt` text and a "Approve" / "Reject" button pair. Approval is sent back via the `request` IPC channel.

## Consequences

- Plugin authors targeting the flow editor implement the `FlowNodeRendererProps` interface and register via ADR-0012 `flow-node-kind`. New kinds slot in without modifying the built-in renderer map.
- The editor state never introduces fields outside `FlowConfig` Zod. Any attempt to persist an invalid `FlowConfig` is caught at the reducer boundary and surfaced to the user — the file is never corrupted.
- Round-trip stability (`parseFlowConfig(serialize(fromReactFlow(toReactFlow(config)))) === config`) is a tested invariant in `packages/os-flow` contract tests. Regressions block CI.
- Visual layout (x/y coordinates and edge waypoints) lives in `<flow-id>.layout.json` alongside the flow file, separate from the `FlowConfig` contract. The contract does not drift with cosmetic changes.
- The performance budget (500 nodes / 2000 edges at 60 fps) is enforced by a Playwright benchmark in CI. Exceeding it blocks the `apps/desktop` build.
- The undo stack persists across restarts, giving a better UX but also adding a new file that must be handled by workspace backup/restore (M2 snapshot-restore).
- React Flow (xyflow) v12 is a production dependency of `packages/os-desktop`. Upgrading it is a semver-guarded change to a `bundled-private` package (ADR-0014) and does not require a public changelog entry. However a major React Flow version bump warrants an ADR amendment given the round-trip contract implications.

## Alternatives Considered

**Rete.js** — Older graph editor library with weaker TypeScript support and a smaller maintenance team. Node renderer model is more rigid, requiring Rete-specific plugin patterns inconsistent with plain React components. Rejected.

**Reaflow** — Simpler API, but lacks the accessibility features, viewport controls, and edge routing quality of React Flow. Smaller ecosystem and slower release cadence. Rejected.

**Custom canvas (HTML Canvas / WebGL)** — Maximum performance and flexibility. Unacceptable engineering cost for an initial implementation: custom hit testing, accessibility layer, zoom/pan, edge routing, and minimap would each require significant work. The performance budget (500 nodes / 2000 edges) is achievable with React Flow's virtual rendering without custom canvas. Reconsidered if the budget is exceeded in practice. Rejected.

**Full-text only with Mermaid render** — Mermaid generates static diagrams from a text DSL. Provides no interactivity, no inspection, no debug highlighting. Read-only Mermaid export for documentation purposes is an open question (§Open Questions) but not a substitute for the interactive editor. Rejected.

## Open Questions

- [ ] **Collaborative editing (CRDT)** — M8 introduces `@agentskit/os-collab` for CRDT real-time co-editing. The editor's reducer-based state model is intentionally designed to be compatible with a CRDT adapter layer, but the integration details are deferred to the M8 ADR. The `FlowConfig` Zod schema is the shared data type; the CRDT layer would operate on its JSON representation.
- [ ] **React Flow as peer dependency vs vendored** — The current decision is to consume React Flow as a versioned npm dependency in `packages/os-desktop`. Vendoring (copying and forking) would give more control over bug fixes but increases maintenance burden. Revisit if upstream releases introduce breaking changes to the node renderer API mid-milestone.
- [ ] **Headless export to PNG/SVG** — Plugin authors and doc generators want to export a flow diagram without launching the full desktop. A headless export path using React Flow's `getViewport` + `html-to-image` (or a custom SVG serializer from the converter) is feasible but deferred post-M3. The converter's purity constraint (no React Flow imports) makes a server-side SVG generator viable in a future `@agentskit/os-flow-diagram` package.
- [ ] **Collaborative cursor display** — If M8 CRDT is adopted, the editor needs to render remote cursors. React Flow does not provide this natively; a custom overlay layer would be needed.
