import { useCallback, useRef, useState } from 'react'
import { getGameUuid } from './game-id'
import { createMediaRequestId, generateImageMedia, MediaServiceError } from './media'

export interface GenImageRequest {
  prompt: string
  ref_url?: string
  requestedSize: { width: number; height: number }
  profile?: 'fast-small' | 'standard'
  referenceMode?: 'edit' | 'avatar'
}

export function useGenImage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const pendingRequestIds = useRef(new Map<string, string>())
  const generate = useCallback(async ({ prompt, ref_url, requestedSize, profile, referenceMode = 'edit' }: GenImageRequest) => {
    setLoading(true); setError(null)
    try {
      const sessionId = getGameUuid()
      if (!sessionId) throw new Error('last-train-to-dawn media: game UUID is unavailable')
      {
        const requestKey = JSON.stringify({ prompt, ref_url, requestedSize, profile, referenceMode })
        const requestId = pendingRequestIds.current.get(requestKey) ?? createMediaRequestId()
        pendingRequestIds.current.set(requestKey, requestId)
        try {
          const task = await generateImageMedia({
            sessionId,
            requestId,
            // Output composition belongs to `size`; the original avatar is
            // identity evidence only. Edit mode preserves the requested
            // action and staging more reliably than avatar-output mode.
            mode: ref_url ? referenceMode : 'text',
            prompt,
            referenceUrls: ref_url ? [ref_url] : [],
            size: requestedSize,
          })
          pendingRequestIds.current.delete(requestKey)
          return task.media.url
        } catch (cause) {
          // A structured response means the service saw the request; a later
          // gameplay retry needs a fresh ID. Network ambiguity keeps the ID so
          // the next attempt can recover the same task without double billing.
          if (cause instanceof MediaServiceError) pendingRequestIds.current.delete(requestKey)
          throw cause
        }
      }
    } catch (cause) {
      const next = cause instanceof Error ? cause : new Error(String(cause)); setError(next); throw next
    } finally { setLoading(false) }
  }, [])
  return { generate, loading, error }
}
