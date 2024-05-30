export type Fetch = (
  url: string,
  requestInit?: {
    headers?: Record<string, string>
    mode?: 'cors'
    method?: 'post' | 'get' | 'POST' | 'GET'
  },
) => Promise<{
  status: number
  ok: boolean
  json: () => Promise<unknown>
  text: () => Promise<string>
}>
