'use client'

interface ScreenReaderAnnouncementsProps {
  politeMessage?: string
  urgentMessage?: string
}

/**
 * Screen Reader Announcements Component
 * Renders invisible live regions for screen reader announcements
 * 
 * Usage:
 * - Include this component in layouts or key pages
 * - Use with useScreenReaderAnnouncements hook
 * - Supports both polite and assertive announcements
 */
export function ScreenReaderAnnouncements({ 
  politeMessage = '', 
  urgentMessage = '' 
}: ScreenReaderAnnouncementsProps) {
  return (
    <>
      {/* Polite announcements - for non-urgent updates like price changes */}
      <div 
        aria-live="polite" 
        aria-atomic="true"
        className="sr-only"
        role="status"
      >
        {politeMessage}
      </div>
      
      {/* Assertive announcements - for urgent updates like trade completions */}
      <div 
        aria-live="assertive" 
        aria-atomic="true"
        className="sr-only"
        role="alert"
      >
        {urgentMessage}
      </div>
    </>
  )
}