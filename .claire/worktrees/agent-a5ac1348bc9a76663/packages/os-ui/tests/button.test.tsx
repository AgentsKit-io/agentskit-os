import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from '../src/components/button'

describe('Button', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('applies accent variant classes', () => {
    render(<Button variant="accent">Accent</Button>)
    const btn = screen.getByRole('button', { name: 'Accent' })
    expect(btn.className).toContain('bg-[var(--ag-accent)]')
  })

  it('applies ghost variant classes', () => {
    render(<Button variant="ghost">Ghost</Button>)
    const btn = screen.getByRole('button', { name: 'Ghost' })
    expect(btn.className).toContain('bg-transparent')
  })

  it('applies outline variant classes', () => {
    render(<Button variant="outline">Outline</Button>)
    const btn = screen.getByRole('button', { name: 'Outline' })
    expect(btn.className).toContain('border')
  })

  it('applies link variant classes', () => {
    render(<Button variant="link">Link</Button>)
    const btn = screen.getByRole('button', { name: 'Link' })
    expect(btn.className).toContain('underline-offset-4')
  })

  it('applies sm size classes', () => {
    render(<Button size="sm">Small</Button>)
    const btn = screen.getByRole('button', { name: 'Small' })
    expect(btn.className).toContain('h-8')
  })

  it('applies lg size classes', () => {
    render(<Button size="lg">Large</Button>)
    const btn = screen.getByRole('button', { name: 'Large' })
    expect(btn.className).toContain('h-11')
  })

  it('merges custom className', () => {
    render(<Button className="custom-class">Custom</Button>)
    const btn = screen.getByRole('button', { name: 'Custom' })
    expect(btn.className).toContain('custom-class')
  })

  it('forwards ref', () => {
    let ref: HTMLButtonElement | null = null
    render(
      <Button ref={(el) => { ref = el }}>Ref</Button>,
    )
    expect(ref).not.toBeNull()
  })

  it('is disabled when disabled prop is passed', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button', { name: 'Disabled' })).toBeDisabled()
  })
})
