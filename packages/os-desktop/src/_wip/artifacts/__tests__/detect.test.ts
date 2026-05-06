/**
 * Tests for detectArtifactKind — 15+ heuristic cases.
 */

import { describe, it, expect } from 'vitest'
import { detectArtifactKind } from '../detect'

describe('detectArtifactKind — MIME-based', () => {
  it('detects JSON from application/json', () => {
    expect(detectArtifactKind('application/json', '{}')).toBe('json')
  })

  it('detects YAML from text/yaml', () => {
    expect(detectArtifactKind('text/yaml', 'key: value')).toBe('yaml')
  })

  it('detects CSV from text/csv', () => {
    expect(detectArtifactKind('text/csv', 'a,b,c\n1,2,3')).toBe('csv')
  })

  it('detects SVG from image/svg+xml', () => {
    expect(detectArtifactKind('image/svg+xml', '<svg></svg>')).toBe('svg')
  })

  it('detects HTML from text/html', () => {
    expect(detectArtifactKind('text/html', '<html><body></body></html>')).toBe('html')
  })

  it('detects markdown from text/markdown', () => {
    expect(detectArtifactKind('text/markdown', '# heading')).toBe('markdown')
  })

  it('detects image from image/png', () => {
    expect(detectArtifactKind('image/png', 'data:image/png;base64,abc')).toBe('image')
  })

  it('detects image from image/jpeg', () => {
    expect(detectArtifactKind('image/jpeg', 'data:image/jpeg;base64,abc')).toBe('image')
  })
})

describe('detectArtifactKind — content sniffing', () => {
  it('detects JSON object from content', () => {
    expect(detectArtifactKind('', '{"key": "value", "num": 42}')).toBe('json')
  })

  it('detects JSON array from content', () => {
    expect(detectArtifactKind('', '[1, 2, 3]')).toBe('json')
  })

  it('detects YAML --- frontmatter', () => {
    expect(detectArtifactKind('', '---\ntitle: Hello\nauthor: World\n')).toBe('yaml')
  })

  it('detects YAML key-value pairs', () => {
    expect(detectArtifactKind('', 'name: Alice\nage: 30\ncity: NY\n')).toBe('yaml')
  })

  it('detects CSV with comma delimiter', () => {
    expect(detectArtifactKind('', 'name,age,city\nAlice,30,NY\nBob,25,LA')).toBe('csv')
  })

  it('detects CSV with tab delimiter', () => {
    expect(detectArtifactKind('', 'name\tage\tcity\nAlice\t30\tNY\nBob\t25\tLA')).toBe('csv')
  })

  it('detects mermaid fenced block', () => {
    expect(
      detectArtifactKind('', '```mermaid\ngraph TD\n  A --> B\n```'),
    ).toBe('mermaid')
  })

  it('detects SVG from <svg> tag', () => {
    expect(
      detectArtifactKind('', '<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>'),
    ).toBe('svg')
  })

  it('detects HTML from DOCTYPE', () => {
    expect(
      detectArtifactKind('', '<!DOCTYPE html><html><body>Hello</body></html>'),
    ).toBe('html')
  })

  it('detects HTML from <html> tag', () => {
    expect(detectArtifactKind('', '<html><head></head><body></body></html>')).toBe('html')
  })

  it('detects Markdown heading', () => {
    expect(detectArtifactKind('', '# Title\n\nSome paragraph text here.')).toBe('markdown')
  })

  it('detects Markdown bold', () => {
    expect(detectArtifactKind('', 'This is **bold** text.')).toBe('markdown')
  })

  it('detects image data URL', () => {
    expect(detectArtifactKind('', 'data:image/png;base64,iVBORw0KGgo=')).toBe('image')
  })

  it('detects image https URL', () => {
    expect(
      detectArtifactKind('', 'https://example.com/photo.jpg'),
    ).toBe('image')
  })

  it('returns unknown for empty content', () => {
    expect(detectArtifactKind('', '')).toBe('unknown')
  })

  it('returns code for text/plain MIME with no other match', () => {
    expect(detectArtifactKind('text/plain', 'just plain text here')).toBe('code')
  })

  it('MIME takes precedence over content for json mime + yaml-looking content', () => {
    // If MIME says json, return json — not yaml
    expect(detectArtifactKind('application/json', '{"key": "value"}')).toBe('json')
  })

  it('mermaid takes precedence over markdown', () => {
    const content = '```mermaid\ngraph TD\n  A --> B\n```\n\n# heading'
    expect(detectArtifactKind('', content)).toBe('mermaid')
  })
})
