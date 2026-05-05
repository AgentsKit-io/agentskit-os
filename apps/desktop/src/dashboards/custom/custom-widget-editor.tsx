/**
 * CustomWidgetEditor — modal form for creating and editing custom widgets.
 *
 * Fields:
 *   - title (string, required)
 *   - kind (number | sparkline | gauge | text)
 *   - source.method (string, required)
 *   - source.pathExpr (string, optional)
 *   - source.pollMs (number, optional, default 5000)
 *   - format.prefix (string, optional)
 *   - format.suffix (string, optional)
 *   - format.precision (number 0-20, optional)
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@agentskit/os-ui'
import {
  saveCustomWidget,
  makeCustomWidgetId,
} from './custom-widget-store'
import type { CustomWidget, CustomWidgetKind } from './custom-widget-types'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
  isOpen: boolean
  /** Widget to edit; undefined means "create new" */
  initial?: CustomWidget | undefined
  onClose: () => void
  /** Called after save; receives the saved widget */
  onSaved?: (widget: CustomWidget) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const KIND_OPTIONS: { value: CustomWidgetKind; label: string }[] = [
  { value: 'number', label: 'Number' },
  { value: 'sparkline', label: 'Sparkline' },
  { value: 'gauge', label: 'Gauge' },
  { value: 'text', label: 'Text' },
]

function emptyForm(): Omit<CustomWidget, 'id'> {
  return {
    title: '',
    kind: 'number',
    source: { method: '', pathExpr: '', pollMs: 5000 },
    format: { prefix: '', suffix: '', precision: undefined },
  }
}

function widgetToForm(w: CustomWidget): Omit<CustomWidget, 'id'> {
  return {
    title: w.title,
    kind: w.kind,
    source: {
      method: w.source.method,
      pathExpr: w.source.pathExpr ?? '',
      pollMs: w.source.pollMs ?? 5000,
    },
    format: {
      prefix: w.format?.prefix ?? '',
      suffix: w.format?.suffix ?? '',
      precision: w.format?.precision,
    },
  }
}

function validateForm(form: Omit<CustomWidget, 'id'>): Record<string, string> {
  const errs: Record<string, string> = {}
  if (!form.title.trim()) errs['title'] = 'Title is required'
  if (!form.source.method.trim()) errs['method'] = 'Source method is required'
  if (form.source.pollMs !== undefined && form.source.pollMs < 100) {
    errs['pollMs'] = 'Poll interval must be at least 100 ms'
  }
  return errs
}

function toWidget(args: {
  form: Omit<CustomWidget, 'id'>
  initial: CustomWidget | undefined
}): CustomWidget {
  const { form, initial } = args
  return {
    id: initial?.id ?? makeCustomWidgetId(),
    title: form.title.trim(),
    kind: form.kind,
    source: {
      method: form.source.method.trim(),
      pathExpr: form.source.pathExpr?.trim() || undefined,
      pollMs: form.source.pollMs,
    },
    format: {
      prefix: form.format?.prefix?.trim() || undefined,
      suffix: form.format?.suffix?.trim() || undefined,
      precision: form.format?.precision,
    },
  }
}

type EditorDialogProps = {
  readonly dialogRef: React.RefObject<HTMLDialogElement | null>
  readonly initial: CustomWidget | undefined
  readonly form: Omit<CustomWidget, 'id'>
  readonly errors: Record<string, string>
  readonly onClose: () => void
  readonly onSave: () => void
  readonly setForm: React.Dispatch<React.SetStateAction<Omit<CustomWidget, 'id'>>>
}

function TitleField({
  value,
  error,
  onChange,
}: {
  readonly value: string
  readonly error: string | undefined
  readonly onChange: (value: string) => void
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="cwe-title" className="text-sm font-medium text-[var(--ag-ink)]">
        Title
      </label>
      <input
        id="cwe-title"
        type="text"
        data-testid="cwe-title"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. Total cost"
        className="rounded-md border border-[var(--ag-line)] bg-[var(--ag-surface)] px-3 py-1.5 text-sm text-[var(--ag-ink)] outline-none focus:ring-2 focus:ring-[var(--ag-accent)]"
      />
      {error && (
        <p className="text-xs text-[var(--ag-danger)]" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function KindField({
  value,
  onChange,
}: {
  readonly value: CustomWidgetKind
  readonly onChange: (value: CustomWidgetKind) => void
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="cwe-kind" className="text-sm font-medium text-[var(--ag-ink)]">
        Display kind
      </label>
      <select
        id="cwe-kind"
        data-testid="cwe-kind"
        value={value}
        onChange={(e) => onChange(e.target.value as CustomWidgetKind)}
        className="rounded-md border border-[var(--ag-line)] bg-[var(--ag-surface)] px-3 py-1.5 text-sm text-[var(--ag-ink)] outline-none focus:ring-2 focus:ring-[var(--ag-accent)]"
      >
        {KIND_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function SourceMethodField({
  value,
  error,
  onChange,
}: {
  readonly value: string
  readonly error: string | undefined
  readonly onChange: (value: string) => void
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="cwe-method" className="text-sm font-medium text-[var(--ag-ink)]">
        Source method{' '}
        <span className="text-xs font-normal text-[var(--ag-ink-subtle)]">(sidecar JSON-RPC)</span>
      </label>
      <input
        id="cwe-method"
        type="text"
        data-testid="cwe-method"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. metrics.cost.total"
        className="rounded-md border border-[var(--ag-line)] bg-[var(--ag-surface)] px-3 py-1.5 font-mono text-sm text-[var(--ag-ink)] outline-none focus:ring-2 focus:ring-[var(--ag-accent)]"
      />
      {error && (
        <p className="text-xs text-[var(--ag-danger)]" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function PathExprField({
  value,
  onChange,
}: {
  readonly value: string
  readonly onChange: (value: string) => void
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="cwe-path" className="text-sm font-medium text-[var(--ag-ink)]">
        Path expression{' '}
        <span className="text-xs font-normal text-[var(--ag-ink-subtle)]">(optional, e.g. data.value)</span>
      </label>
      <input
        id="cwe-path"
        type="text"
        data-testid="cwe-path"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. result.total"
        className="rounded-md border border-[var(--ag-line)] bg-[var(--ag-surface)] px-3 py-1.5 font-mono text-sm text-[var(--ag-ink)] outline-none focus:ring-2 focus:ring-[var(--ag-accent)]"
      />
    </div>
  )
}

function PollMsField({
  value,
  error,
  onChange,
}: {
  readonly value: number
  readonly error: string | undefined
  readonly onChange: (value: number) => void
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="cwe-poll" className="text-sm font-medium text-[var(--ag-ink)]">
        Poll interval <span className="text-xs font-normal text-[var(--ag-ink-subtle)]">(ms)</span>
      </label>
      <input
        id="cwe-poll"
        type="number"
        data-testid="cwe-poll"
        min={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-md border border-[var(--ag-line)] bg-[var(--ag-surface)] px-3 py-1.5 text-sm text-[var(--ag-ink)] outline-none focus:ring-2 focus:ring-[var(--ag-accent)]"
      />
      {error && (
        <p className="text-xs text-[var(--ag-danger)]" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function FormatField({
  prefix,
  suffix,
  precision,
  onPrefix,
  onSuffix,
  onPrecision,
}: {
  readonly prefix: string
  readonly suffix: string
  readonly precision: number | undefined
  readonly onPrefix: (value: string) => void
  readonly onSuffix: (value: string) => void
  readonly onPrecision: (value: number | undefined) => void
}): React.JSX.Element {
  return (
    <fieldset className="rounded-md border border-[var(--ag-line)] p-4">
      <legend className="px-1 text-sm font-medium text-[var(--ag-ink)]">
        Format <span className="text-xs font-normal text-[var(--ag-ink-subtle)]">(optional)</span>
      </legend>
      <div className="mt-3 grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="cwe-prefix" className="text-xs text-[var(--ag-ink-muted)]">
            Prefix
          </label>
          <input
            id="cwe-prefix"
            type="text"
            data-testid="cwe-prefix"
            value={prefix}
            onChange={(e) => onPrefix(e.target.value)}
            placeholder="$"
            className="rounded-md border border-[var(--ag-line)] bg-[var(--ag-surface)] px-2 py-1 text-sm text-[var(--ag-ink)] outline-none focus:ring-2 focus:ring-[var(--ag-accent)]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="cwe-suffix" className="text-xs text-[var(--ag-ink-muted)]">
            Suffix
          </label>
          <input
            id="cwe-suffix"
            type="text"
            data-testid="cwe-suffix"
            value={suffix}
            onChange={(e) => onSuffix(e.target.value)}
            placeholder="ms"
            className="rounded-md border border-[var(--ag-line)] bg-[var(--ag-surface)] px-2 py-1 text-sm text-[var(--ag-ink)] outline-none focus:ring-2 focus:ring-[var(--ag-accent)]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="cwe-precision" className="text-xs text-[var(--ag-ink-muted)]">
            Precision
          </label>
          <input
            id="cwe-precision"
            type="number"
            data-testid="cwe-precision"
            min={0}
            max={20}
            value={precision ?? ''}
            onChange={(e) => onPrecision(e.target.value === '' ? undefined : Number(e.target.value))}
            placeholder="2"
            className="rounded-md border border-[var(--ag-line)] bg-[var(--ag-surface)] px-2 py-1 text-sm text-[var(--ag-ink)] outline-none focus:ring-2 focus:ring-[var(--ag-accent)]"
          />
        </div>
      </div>
    </fieldset>
  )
}

function CustomWidgetEditorDialog({
  dialogRef,
  initial,
  form,
  errors,
  onClose,
  onSave,
  setForm,
}: EditorDialogProps): React.JSX.Element {
  return (
    <dialog
      ref={dialogRef}
      data-testid="custom-widget-editor"
      aria-label={initial ? 'Edit custom widget' : 'New custom widget'}
      aria-modal="true"
      className="m-auto max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[var(--ag-line)] bg-[var(--ag-panel)] p-0 shadow-xl backdrop:bg-black/40"
    >
      <div className="sticky top-0 flex items-center justify-between border-b border-[var(--ag-line)] bg-[var(--ag-panel)] px-5 py-4">
        <h2 className="text-base font-semibold text-[var(--ag-ink)]">
          {initial ? 'Edit custom widget' : 'New custom widget'}
        </h2>
        <button
          type="button"
          aria-label="Close editor"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--ag-ink-muted)] hover:bg-[var(--ag-panel-alt)] hover:text-[var(--ag-ink)]"
        >
          ×
        </button>
      </div>

      <div className="flex flex-col gap-5 px-5 py-5">
        <TitleField
          value={form.title}
          error={errors['title']}
          onChange={(value) => setForm((f) => ({ ...f, title: value }))}
        />
        <KindField value={form.kind} onChange={(value) => setForm((f) => ({ ...f, kind: value }))} />
        <SourceMethodField
          value={form.source.method}
          error={errors['method']}
          onChange={(value) => setForm((f) => ({ ...f, source: { ...f.source, method: value } }))}
        />
        <PathExprField
          value={form.source.pathExpr ?? ''}
          onChange={(value) => setForm((f) => ({ ...f, source: { ...f.source, pathExpr: value } }))}
        />
        <PollMsField
          value={form.source.pollMs ?? 5000}
          error={errors['pollMs']}
          onChange={(value) => setForm((f) => ({ ...f, source: { ...f.source, pollMs: value } }))}
        />
        <FormatField
          prefix={form.format?.prefix ?? ''}
          suffix={form.format?.suffix ?? ''}
          precision={form.format?.precision}
          onPrefix={(value) => setForm((f) => ({ ...f, format: { ...f.format, prefix: value } }))}
          onSuffix={(value) => setForm((f) => ({ ...f, format: { ...f.format, suffix: value } }))}
          onPrecision={(value) =>
            setForm((f) => ({ ...f, format: { ...f.format, precision: value } }))
          }
        />
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-[var(--ag-line)] px-5 py-4">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button size="sm" data-testid="cwe-save" onClick={onSave}>
          Save
        </Button>
      </div>
    </dialog>
  )
}

export function CustomWidgetEditor({ isOpen, initial, onClose, onSaved }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [form, setForm] = useState<Omit<CustomWidget, 'id'>>(
    initial ? widgetToForm(initial) : emptyForm(),
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset form when the modal opens with new data
  useEffect(() => {
    setForm(initial ? widgetToForm(initial) : emptyForm())
    setErrors({})
  }, [initial, isOpen])

  // Sync native dialog open/close
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (isOpen) {
      if (!dialog.open) dialog.showModal()
    } else {
      if (dialog.open) dialog.close()
    }
  }, [isOpen])

  // Close on Escape (native dialog cancel)
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const onCancel = (e: Event) => {
      e.preventDefault()
      onClose()
    }
    dialog.addEventListener('cancel', onCancel)
    return () => dialog.removeEventListener('cancel', onCancel)
  }, [onClose])

  const validate = useCallback((): boolean => {
    const errs = validateForm(form)
    setErrors(errs)
    return Object.keys(errs).length === 0
  }, [form])

  const closeDialog = useCallback((): void => {
    onClose()
  }, [onClose])

  const persistWidget = useCallback(
    (widget: CustomWidget): void => {
      saveCustomWidget(widget)
      onSaved?.(widget)
    },
    [onSaved],
  )

  const handleSave = useCallback(() => {
    if (!validate()) return

    const widget = toWidget({ form, initial })

    persistWidget(widget)
    closeDialog()
  }, [form, initial, validate, persistWidget, closeDialog])

  if (!isOpen) return null

  return (
    <CustomWidgetEditorDialog
      dialogRef={dialogRef}
      initial={initial}
      form={form}
      errors={errors}
      onClose={onClose}
      onSave={handleSave}
      setForm={setForm}
    />
  )
}
