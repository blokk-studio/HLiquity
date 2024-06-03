import { AccountId, TokenId } from "@hashgraph/sdk";
import { Address } from "@liquity/lib-base";
import { type Fetch } from "./fetch";

// there is a duplicate of this in lib-hashgraph because of bundling limitations

type TokenIdString = `0.0.${number}`;

interface HederaApiToken {
  token_id: TokenIdString;
}

interface HederaApiTokensData {
  tokens: HederaApiToken[];
}

interface FetchTokensByTokenIdOptions {
  apiBaseUrl: string;
  accountId: AccountId;
  fetch: Fetch;
}

interface FetchTokensByEvmAddressOptions {
  apiBaseUrl: string;
  evmAddress: Address;
  fetch: Fetch;
}

export const fetchTokens = async (
  options: FetchTokensByTokenIdOptions | FetchTokensByEvmAddressOptions
) => {
  const accountAddressUrlSegment =
    "accountId" in options ? options.accountId.toString() : options.evmAddress.replace(/^0x/, "");

  const response = await options.fetch(
    `${options.apiBaseUrl}/accounts/${accountAddressUrlSegment}/tokens`,
    {
      method: "GET",
      headers: {
        "Cache-Control": "no-cache"
      }
    }
  );

  if (!response.ok) {
    const responseText = await response.text();
    const message = `tokens api responded with ${
      response.status
    }: \`${responseText}\` for account ${accountAddressUrlSegment}. received: ${JSON.stringify({
      ...options,
      accountAddressUrlSegment,
      responseText,
      response
    })}`;
    throw new Error(message);
  }

  const data = (await response.json()) as HederaApiTokensData;

  const tokens = data.tokens.map(tokenData => {
    const id = tokenData.token_id;
    const token = {
      id
    };

    return token;
  });

  return tokens;
};

interface WaitForTokensByTokenIdOptions extends FetchTokensByTokenIdOptions {
  requiredAssociations?: TokenId[];
  requiredDissociations?: TokenId[];
}

interface WaitForTokensByEvmAddressOptions extends FetchTokensByEvmAddressOptions {
  requiredAssociations?: TokenId[];
  requiredDissociations?: TokenId[];
}

const numberOfWaitForTokenAttempts = 5;
const millisecondsBetweenTokenAttempts = 2000;
export const waitForTokenState = async (
  options: WaitForTokensByTokenIdOptions | WaitForTokensByEvmAddressOptions
) => {
  const requiredAssociationIdStrings = options.requiredAssociations
    ? options.requiredAssociations.map(tokenId => tokenId.toString() as TokenIdString)
    : [];
  const requiredDissociationIdStrings = options.requiredDissociations
    ? options.requiredDissociations.map(tokenId => tokenId.toString() as TokenIdString)
    : [];

  let tokens: { id: TokenIdString }[] = [];
  for (let attempt = 0; attempt < numberOfWaitForTokenAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, millisecondsBetweenTokenAttempts));

    tokens = await fetchTokens(options);
    const tokenIdStringSet = new Set(tokens.map(token => token.id));
    const hasAllRequiredAssociations = requiredAssociationIdStrings.every(tokenIdString =>
      tokenIdStringSet.has(tokenIdString)
    );
    const hasAllRequiredDissociations = requiredDissociationIdStrings.every(
      tokenIdString => !tokenIdStringSet.has(tokenIdString)
    );

    if (hasAllRequiredAssociations && hasAllRequiredDissociations) {
      break;
    }
  }

  return tokens;
};
