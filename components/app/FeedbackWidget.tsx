'use client'
import { useFeedbackWidget } from 'featurebase-js/react'

export function FeedbackWidget() {
  useFeedbackWidget({
    theme: 'dark',
    placement: 'bottom-right',
    locale: 'en',
  })
  return null
}
