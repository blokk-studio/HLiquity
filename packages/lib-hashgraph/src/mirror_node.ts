import { Fetch } from './fetch'

interface HederaApiToken {
  token_id: `0.0.${string}`
}

interface HederaApiTokensData {
  tokens: HederaApiToken[]
}

export const fetchTokens = async <FetchInstance extends Fetch>(options: {
  apiBaseUrl: string
  accountAddress: `0x${string}`
  fetch: FetchInstance
}) => {
  const accountAddressUrlSegment = options.accountAddress.replace(/^0x/, '')
  const response = await options.fetch(
    `${options.apiBaseUrl}/accounts/${accountAddressUrlSegment}/tokens`,
    {
      method: 'GET',
    },
  )

  if (!response.ok) {
    const responseText = await response.text()
    const message = `tokens api responded with ${response.status}: \`${responseText}\` for account ${options.accountAddress}`
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
