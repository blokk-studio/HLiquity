interface HederaApiToken {
  token_id: `0.0.${string}`;
}
interface HederaApiTokensData {
  tokens: HederaApiToken[];
}

export const fetchTokens = async (options: {
  apiBaseUrl: string;
  accountAddress: `0x${string}`;
}) => {
  const accountAddressUrlSegment = options.accountAddress.replace(/^0x/, "");
  // TODO: get api endpoint based on chain id
  const response = await fetch(`${options.apiBaseUrl}/accounts/${accountAddressUrlSegment}/tokens`, {
    method: "GET",
    headers: {}
  });

  if (!response.ok) {
    const responseText = await response.text();
    const errorMessage = `tokens api responded with ${response.status}: \`${responseText}\``;
    console.error(errorMessage, { responseText, response });
    throw new Error(errorMessage);
  }

  const data: HederaApiTokensData = await response.json();

  const tokens = data.tokens.map(tokenData => {
    const id = tokenData.token_id;
    const token = {
      id
    };

    return token;
  });

  return tokens;
};
