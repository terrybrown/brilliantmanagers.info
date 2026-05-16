import React from 'react'

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
}

function extractText(node: React.ReactNode): string {
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(extractText).join('')
  if (React.isValidElement(node)) {
    return extractText((node.props as { children?: React.ReactNode }).children)
  }
  return ''
}

export function GuideDetails({
  children,
  ...props
}: React.DetailsHTMLAttributes<HTMLDetailsElement>) {
  const childArray = React.Children.toArray(children)
  const summaryChild = childArray.find(
    (child) => React.isValidElement(child) && child.type === 'summary'
  )
  const summaryText = summaryChild
    ? extractText(
        (summaryChild as React.ReactElement<{ children?: React.ReactNode }>).props.children
      )
    : ''
  const id = toSlug(summaryText)

  return (
    <details id={id} {...props}>
      {children}
    </details>
  )
}
