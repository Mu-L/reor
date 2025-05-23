/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
import React, { useRef, useEffect, useState, useMemo } from 'react'

import posthog from 'posthog-js'

import { removeFileExtension } from '@/lib/file'

export interface SuggestionsState {
  textWithinBrackets: string
  position: { top: number; left: number }
  onSelect: (suggestion: string) => void
}

export interface SuggestionsDisplayProps {
  suggestionsState: SuggestionsState
  suggestions: string[]
  maxWidth?: string
}

const InEditorBacklinkSuggestionsDisplay: React.FC<SuggestionsDisplayProps> = ({
  suggestionsState,
  suggestions,
  maxWidth = 'max-w-sm',
}) => {
  const suggestionsRef = useRef<HTMLDivElement | null>(null)
  const [layout, setLayout] = useState({
    top: -9999,
    left: -9999,
    display: 'none',
  })

  const filteredSuggestions = useMemo(() => {
    if (!suggestionsState.textWithinBrackets) return []
    const lowerCaseText = suggestionsState.textWithinBrackets.toLowerCase()
    return suggestions
      .filter((suggestion) => suggestion.toLowerCase().includes(lowerCaseText))
      .map(removeFileExtension)
      .slice(0, 5)
  }, [suggestions, suggestionsState.textWithinBrackets])

  useEffect(() => {
    if (!suggestionsState.position || filteredSuggestions.length === 0 || !suggestionsRef.current) {
      return
    }
    const { top, left } = suggestionsState.position
    const { height } = suggestionsRef.current.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const shouldDisplayAbove = top + height > viewportHeight && top > height

    setLayout({
      top: shouldDisplayAbove ? top - height : top,
      left,
      display: 'block',
    })
  }, [suggestionsState.position, filteredSuggestions])

  if (filteredSuggestions.length === 0) return null

  return (
    <div
      ref={suggestionsRef}
      className={`absolute rounded bg-white text-black ${maxWidth} z-50 whitespace-normal  break-words border border-black`}
      style={{
        left: `${layout.left}px`,
        top: `${layout.top}px`,
        display: layout.display,
      }}
    >
      <ul className="m-0 list-none p-0">
        {filteredSuggestions.map((suggestion, index) => (
          <li
            key={suggestion} // Use a unique id property from the suggestion
            className="cursor-pointer rounded p-1 text-sm hover:bg-gray-100"
            onClick={() => {
              posthog.capture('select_backlink_suggestion', {
                rank: index + 1,
              })
              suggestionsState.onSelect?.(suggestion)
            }}
          >
            {suggestion}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default InEditorBacklinkSuggestionsDisplay
