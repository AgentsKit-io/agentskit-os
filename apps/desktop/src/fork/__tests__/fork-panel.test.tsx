/**
 * ForkPanel UI tests (M2 #178).
 *
 * Verifies:
 * - Modal renders with trace id in header
 * - Name and description fields are editable
 * - Node rows render for each node in the draft
 * - Save button triggers sidecarRequest and shows success state
 * - Validation: empty name disables save / shows error
 * - Close button calls onClose
 * - Error state when sidecar throws
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ForkPanel } from '../fork-panel'
import type { ForkDraft } from '../fork-types'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../../lib/sidecar', () => ({
  sidecarRequest: vi.fn(),
}))

import { sidecarRequest } from '../../lib/sidecar'
const mockSidecarRequest = vi.mocked(sidecarRequest)

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const DRAFT: ForkDraft = {
  name: 'my-flow fork',
  description: 'Auto-derived from trace',
  nodes: [
    { id: 'root', kind: 'flow', label: 'flow.started' },
    { id: 'agent-1', kind: 'agent', agent: 'onboarding-agent', label: 'agent.started' },
    { id: 'tool-1', kind: 'tool', tool: 'fetch-data', label: 'tool.started' },
  ],
  edges: [
    { source: 'root', target: 'agent-1' },
    { source: 'agent-1', target: 'tool-1' },
  ],
}

const EMPTY_DRAFT: ForkDraft = {
  name: 'empty fork',
  nodes: [],
  edges: [],
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderPanel(
  overrides: Partial<ForkDraft> = {},
  extraProps: Partial<React.ComponentProps<typeof ForkPanel>> = {},
) {
  const onClose = vi.fn()
  const onSaved = vi.fn()
  const props = {
    isOpen: true,
    traceId: 'trace-001',
    initialDraft: { ...DRAFT, ...overrides },
    onClose,
    onSaved,
    ...extraProps,
  }
  render(<ForkPanel {...props} />)
  return { onClose, onSaved }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ForkPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSidecarRequest.mockResolvedValue({ flowId: 'flow-new-123' })
  })

  // -------------------------------------------------------------------------
  // Visibility
  // -------------------------------------------------------------------------

  it('renders nothing when isOpen is false', () => {
    render(
      <ForkPanel
        isOpen={false}
        traceId="trace-001"
        initialDraft={DRAFT}
        onClose={() => undefined}
      />,
    )
    expect(screen.queryByTestId('fork-panel')).toBeNull()
  })

  it('renders the panel with dialog role when open', () => {
    renderPanel()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByTestId('fork-panel')).toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // Header
  // -------------------------------------------------------------------------

  it('shows trace id in the header', () => {
    renderPanel()
    expect(screen.getByText('trace-001')).toBeInTheDocument()
  })

  it('shows "Fork as flow" heading', () => {
    renderPanel()
    expect(screen.getByText('Fork as flow')).toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // Form fields
  // -------------------------------------------------------------------------

  it('populates name input with initial draft name', () => {
    renderPanel()
    const input = screen.getByTestId('fork-name-input') as HTMLInputElement
    expect(input.value).toBe('my-flow fork')
  })

  it('populates description input with initial description', () => {
    renderPanel()
    const textarea = screen.getByTestId('fork-description-input') as HTMLTextAreaElement
    expect(textarea.value).toBe('Auto-derived from trace')
  })

  it('allows editing the name', () => {
    renderPanel()
    const input = screen.getByTestId('fork-name-input')
    fireEvent.change(input, { target: { value: 'my-renamed-flow' } })
    expect((input as HTMLInputElement).value).toBe('my-renamed-flow')
  })

  it('allows editing the description', () => {
    renderPanel()
    const textarea = screen.getByTestId('fork-description-input')
    fireEvent.change(textarea, { target: { value: 'New description' } })
    expect((textarea as HTMLTextAreaElement).value).toBe('New description')
  })

  // -------------------------------------------------------------------------
  // Node rows
  // -------------------------------------------------------------------------

  it('renders a row for each node', () => {
    renderPanel()
    const rows = screen.getAllByTestId('fork-node-row')
    expect(rows).toHaveLength(3)
  })

  it('shows kind badge for each node', () => {
    renderPanel()
    expect(screen.getByText('Flow')).toBeInTheDocument()
    expect(screen.getAllByText('Agent')).toHaveLength(1)
    expect(screen.getAllByText('Tool')).toHaveLength(1)
  })

  it('renders editable agent id input for agent nodes', () => {
    renderPanel()
    const agentInput = screen.getByLabelText('Agent ID for node agent-1')
    expect(agentInput).toBeInTheDocument()
    expect((agentInput as HTMLInputElement).value).toBe('onboarding-agent')
  })

  it('renders editable tool id input for tool nodes', () => {
    renderPanel()
    const toolInput = screen.getByLabelText('Tool ID for node tool-1')
    expect(toolInput).toBeInTheDocument()
    expect((toolInput as HTMLInputElement).value).toBe('fetch-data')
  })

  it('allows editing agent id', () => {
    renderPanel()
    const agentInput = screen.getByLabelText('Agent ID for node agent-1')
    fireEvent.change(agentInput, { target: { value: 'new-agent' } })
    expect((agentInput as HTMLInputElement).value).toBe('new-agent')
  })

  it('shows no node list when draft has no nodes', () => {
    renderPanel({ nodes: [], edges: [] })
    expect(screen.queryByTestId('fork-node-row')).toBeNull()
  })

  // -------------------------------------------------------------------------
  // Save — success path
  // -------------------------------------------------------------------------

  it('calls sidecarRequest flows.create with the draft on save', async () => {
    renderPanel()
    await act(async () => {
      fireEvent.click(screen.getByTestId('fork-save-button'))
    })
    await waitFor(() => {
      expect(mockSidecarRequest).toHaveBeenCalledWith('flows.create', {
        draft: expect.objectContaining({ name: 'my-flow fork' }),
      })
    })
  })

  it('shows success state with flow id after save', async () => {
    renderPanel()
    await act(async () => {
      fireEvent.click(screen.getByTestId('fork-save-button'))
    })
    await waitFor(() => {
      expect(screen.getByTestId('fork-success')).toBeInTheDocument()
      expect(screen.getByText('flow-new-123')).toBeInTheDocument()
    })
  })

  it('calls onSaved callback with the new flow id', async () => {
    const { onSaved } = renderPanel()
    await act(async () => {
      fireEvent.click(screen.getByTestId('fork-save-button'))
    })
    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledWith('flow-new-123')
    })
  })

  it('hides the form after successful save', async () => {
    renderPanel()
    await act(async () => {
      fireEvent.click(screen.getByTestId('fork-save-button'))
    })
    await waitFor(() => {
      expect(screen.queryByTestId('fork-save-button')).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // Save — fallback when sidecar returns {}
  // -------------------------------------------------------------------------

  it('generates a fallback flow id when sidecar returns empty object', async () => {
    mockSidecarRequest.mockResolvedValue({})
    renderPanel()
    await act(async () => {
      fireEvent.click(screen.getByTestId('fork-save-button'))
    })
    await waitFor(() => {
      const success = screen.getByTestId('fork-success')
      expect(success).toBeInTheDocument()
      // Fallback id starts with "flow-"
      expect(success.textContent).toMatch(/flow-\d+/)
    })
  })

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

  it('disables save button when name is empty', () => {
    renderPanel({ name: '' })
    const btn = screen.getByTestId('fork-save-button') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })

  it('disables save button when name is cleared to empty', async () => {
    renderPanel()
    const nameInput = screen.getByTestId('fork-name-input')
    fireEvent.change(nameInput, { target: { value: '' } })
    await waitFor(() => {
      const btn = screen.getByTestId('fork-save-button') as HTMLButtonElement
      expect(btn.disabled).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------

  it('shows error message when sidecarRequest throws', async () => {
    mockSidecarRequest.mockRejectedValue(new Error('Network failure'))
    renderPanel()
    await act(async () => {
      fireEvent.click(screen.getByTestId('fork-save-button'))
    })
    await waitFor(() => {
      expect(screen.getByTestId('fork-error')).toBeInTheDocument()
      expect(screen.getByText('Network failure')).toBeInTheDocument()
    })
  })

  // -------------------------------------------------------------------------
  // Close
  // -------------------------------------------------------------------------

  it('calls onClose when the × button is clicked', () => {
    const { onClose } = renderPanel()
    fireEvent.click(screen.getByLabelText('Close fork panel'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when Cancel is clicked', () => {
    const { onClose } = renderPanel()
    fireEvent.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
