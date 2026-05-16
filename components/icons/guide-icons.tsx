import {
  BarChart3,
  Compass,
  Users,
  Map,
  MessageSquare,
  Lightbulb,
  HelpCircle,
  BookOpen,
  Gauge,
  PenLine,
  type LucideIcon,
} from 'lucide-react'
import React from 'react'

interface SectionIconProps {
  size?: number
}

function StyledIcon({ Icon, size = 20 }: { Icon: LucideIcon; size?: number }) {
  return (
    <Icon
      size={size}
      strokeWidth={1.75}
      style={{ color: 'var(--color-accent)', flexShrink: 0 }}
    />
  )
}

const SECTION_ICON_MAP: Record<string, LucideIcon> = {
  measurement: BarChart3,
  self: Compass,
  team: Users,
  strategy: Map,
  communications: MessageSquare,
  'domain-expertise': Lightbulb,
  faq: HelpCircle,
}

export function GuideIcon({ section, size }: { section: string; size?: number }) {
  const Icon = SECTION_ICON_MAP[section]
  if (!Icon) return null
  return <StyledIcon Icon={Icon} size={size} />
}

export function GuideBookIcon({ size }: SectionIconProps) {
  return <StyledIcon Icon={BookOpen} size={size} />
}

export function GaugeIcon({ size }: SectionIconProps) {
  return <StyledIcon Icon={Gauge} size={size} />
}

export function BlogIcon({ size }: SectionIconProps) {
  return <StyledIcon Icon={PenLine} size={size} />
}
