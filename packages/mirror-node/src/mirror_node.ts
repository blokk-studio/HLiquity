import type { AccountId, TokenId } from '@hashgraph/sdk'
import { Address } from '@liquity/lib-base'

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

type TokenIdString = `0.0.${number}`

interface HederaApiToken {
  token_id: TokenIdString
}

interface HederaApiTokensData {
  tokens: HederaApiToken[]
}

interface FetchTokensByTokenIdOptions {
  tokenIds: TokenId[]
  apiBaseUrl: string
  accountId: AccountId
  fetch: Fetch
}

interface FetchTokensByEvmAddressOptions {
  tokenIds: TokenId[]
  apiBaseUrl: string
  evmAddress: Address
  fetch: Fetch
}

export const fetchTokens = async (
  options: FetchTokensByTokenIdOptions | FetchTokensByEvmAddressOptions,
) => {
  const accountAddressUrlSegment =
    'accountId' in options ? options.accountId.toString() : options.evmAddress.replace(/^0x/, '')

  const tokenFilter = `?${options.tokenIds
    .map((tokenId) => {
      const tokenIdString = tokenId.toString()
      const filter = `token.id[]=${tokenIdString}`

      return filter
    })
    .join('&')}`
  const response = await options.fetch(
    `${options.apiBaseUrl}/accounts/${accountAddressUrlSegment}/tokens${tokenFilter}`,
    {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
      },
    },
  )

  if (!response.ok) {
    const responseText = await response.text()
    const message = `tokens api responded with ${
      response.status
    }: \`${responseText}\` for account ${accountAddressUrlSegment}. received: ${JSON.stringify({
      ...options,
      accountAddressUrlSegment,
      responseText,
      response,
    })}`
    throw new Error(message)
  }

  const data = (await response.json()) as HederaApiTokensData

  const tokens = data.tokens.map((tokenData) => {
    const id = tokenData.token_id
    const token = {
      id,
    }

    return token
  })

  return tokens
}

interface WaitForTokensByTokenIdOptions extends FetchTokensByTokenIdOptions {
  requiredAssociations?: TokenId[]
  requiredDissociations?: TokenId[]
}

interface WaitForTokensByEvmAddressOptions extends FetchTokensByEvmAddressOptions {
  requiredAssociations?: TokenId[]
  requiredDissociations?: TokenId[]
}

const getAttemptWaitTime = (attemptNumber: number) => {
  // 2s for attempts 1-5
  if (attemptNumber < 5) {
    return 2000
  }

  // 4s for attempts 1-5
  if (attemptNumber < 10) {
    return 4000
  }

  // every 8s from then on
  return 8000
}
export const waitForTokenState = async (
  options: WaitForTokensByTokenIdOptions | WaitForTokensByEvmAddressOptions,
) => {
  const requiredAssociationIdStrings = options.requiredAssociations
    ? options.requiredAssociations.map((tokenId) => tokenId.toString() as TokenIdString)
    : []
  const requiredDissociationIdStrings = options.requiredDissociations
    ? options.requiredDissociations.map((tokenId) => tokenId.toString() as TokenIdString)
    : []

  let attempt = 0
  let tokens: { id: TokenIdString }[] = []
  let hasAllRequiredAssociations = false
  let hasAllRequiredDissociations = false
  while (!hasAllRequiredAssociations || !hasAllRequiredDissociations) {
    const waitTime = getAttemptWaitTime(attempt)
    await new Promise((resolve) => setTimeout(resolve, waitTime))

    try {
      tokens = await fetchTokens(options)
    } catch {
      // ignore errors
    }

    const tokenIdStringSet = new Set(tokens.map((token) => token.id))
    hasAllRequiredAssociations = requiredAssociationIdStrings.every((tokenIdString) =>
      tokenIdStringSet.has(tokenIdString),
    )
    hasAllRequiredDissociations = requiredDissociationIdStrings.every(
      (tokenIdString) => !tokenIdStringSet.has(tokenIdString),
    )

    attempt++
  }

  return tokens
}
