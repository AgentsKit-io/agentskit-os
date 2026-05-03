import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../src/components/card'

describe('Card', () => {
  it('renders Card with children', () => {
    render(<Card data-testid="card">Content</Card>)
    expect(screen.getByTestId('card')).toBeInTheDocument()
  })

  it('applies panel background class', () => {
    render(<Card data-testid="card">Content</Card>)
    expect(screen.getByTestId('card').className).toContain('bg-[var(--ag-panel)]')
  })

  it('renders CardHeader', () => {
    render(<CardHeader data-testid="header">Header</CardHeader>)
    expect(screen.getByTestId('header')).toBeInTheDocument()
  })

  it('renders CardTitle', () => {
    render(<CardTitle>My Title</CardTitle>)
    expect(screen.getByText('My Title')).toBeInTheDocument()
  })

  it('renders CardDescription with muted ink class', () => {
    render(<CardDescription data-testid="desc">Description</CardDescription>)
    const el = screen.getByTestId('desc')
    expect(el.className).toContain('text-[var(--ag-ink-muted)]')
  })

  it('renders CardContent', () => {
    render(<CardContent data-testid="content">Content</CardContent>)
    expect(screen.getByTestId('content')).toBeInTheDocument()
  })

  it('renders CardFooter', () => {
    render(<CardFooter data-testid="footer">Footer</CardFooter>)
    expect(screen.getByTestId('footer')).toBeInTheDocument()
  })

  it('renders full composition', () => {
    render(
      <Card data-testid="full-card">
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
        </CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>,
    )
    expect(screen.getByTestId('full-card')).toBeInTheDocument()
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Description')).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
    expect(screen.getByText('Footer')).toBeInTheDocument()
  })

  it('forwards ref on Card', () => {
    let ref: HTMLDivElement | null = null
    render(<Card ref={(el) => { ref = el }}>Content</Card>)
    expect(ref).not.toBeNull()
  })
})
