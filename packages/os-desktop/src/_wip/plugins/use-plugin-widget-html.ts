import { useCallback } from 'react'
import { sidecarRequest } from '../lib/sidecar'

type WidgetRenderResponse = {
  html: string
}

export const usePluginWidgetHtml = (): ((args: {
  pluginId: string
  kind: string
  props: Record<string, unknown>
}) => Promise<string>) => {
  return useCallback(
    async (args: { pluginId: string; kind: string; props: Record<string, unknown> }): Promise<string> => {
      const response = await sidecarRequest<WidgetRenderResponse>('plugins.widget.render', args)
      if (response && typeof response === 'object' && 'html' in response && typeof response.html === 'string') {
        return response.html
      }
      return ''
    },
    [],
  )
}

