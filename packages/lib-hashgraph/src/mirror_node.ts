import { AccountId } from '@hashgraph/sdk'
import { type Fetch } from './fetch'

interface HederaApiToken {
  token_id: `0.0.${number}`
}

interface HederaApiTokensData {
  tokens: HederaApiToken[]
}

// there is a duplicate of this in lib-ethers because of bundling limitations
export const fetchTokens = async <FetchInstance extends Fetch>(
  options:
    | {
        apiBaseUrl: string
        accountAddress: `0x${string}`
        fetch: FetchInstance
      }
    | {
        apiBaseUrl: string
        accountId: AccountId
        fetch: FetchInstance
      },
) => {
  // usually getting stale responses
  await new Promise((resolve) => setTimeout(resolve, 4000))

  const accountAddressUrlSegment =
    'accountId' in options
      ? options.accountId.toString()
      : options.accountAddress.replace(/^0x/, '')

  const response = await options.fetch(
    `${options.apiBaseUrl}/accounts/${accountAddressUrlSegment}/tokens`,
    {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
      },
    },
  )

  if (!response.ok) {
    const responseText = await response.text()
    const message = `tokens api responded with ${response.status}: \`${responseText}\` for account ${accountAddressUrlSegment}`
    console.error(message, { ...options, accountAddressUrlSegment, responseText, response })
    throw new Error(
      `${message}. received: ${JSON.stringify({
        ...options,
        accountAddressUrlSegment,
        responseText,
      })}`,
    )
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
