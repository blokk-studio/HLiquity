import { Decimal } from "@liquity/lib-base";

type CoinGeckoSimplePriceResponse<T extends string, U extends string> = {
  [P in T]: {
    [Q in U]: number;
  };
};

const hasProp = <T extends object, P extends string>(o: T, p: P): o is T & { [_ in P]: unknown } =>
  p in o;

const validateCoinGeckoSimplePriceResponse = <T extends string, U extends string>(
  expectedCoinIds: readonly T[],
  expectedCurrencies: readonly U[],
  body: Record<T, Record<U, number | undefined>>
): CoinGeckoSimplePriceResponse<T, U> => {
  if (typeof body !== "object" || body === null) {
    throw new Error(`unexpected response from CoinGecko`);
  }

  for (const coinId of expectedCoinIds) {
    if (!hasProp(body, coinId)) {
      throw new Error(`coin "${coinId}" missing from CoinGecko response`);
    }

    const coinPrices = body[coinId];

    if (typeof coinPrices !== "object" || coinPrices === null) {
      throw new Error(`unexpected response from CoinGecko`);
    }

    for (const currency of expectedCurrencies) {
      if (!hasProp(coinPrices, currency)) {
        throw new Error(`currency "${currency}" missing from CoinGecko response`);
      }

      if (typeof coinPrices[currency] !== "number") {
        throw new Error(`price of coin "${coinId}" in currency "${currency}" is not a number`);
      }
    }
  }

  return body as CoinGeckoSimplePriceResponse<T, U>;
};

const fetchCoinGeckoSimplePrice = async <T extends string, U extends string>(
  coinIds: readonly T[],
  vsCurrencies: readonly U[]
): Promise<CoinGeckoSimplePriceResponse<T, U>> => {
  const simplePriceUrl =
    "https://api.coingecko.com/api/v3/simple/price?" +
    new URLSearchParams({
      ids: coinIds.join(","),
      vs_currencies: vsCurrencies.join(",")
    });

  const response = await window.fetch(simplePriceUrl, {
    headers: {
      accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`couldn't fetch price from CoinGecko: got status ${response.status}`);
  }

  return validateCoinGeckoSimplePriceResponse(coinIds, vsCurrencies, await response.json());
};

export interface HlqtPriceResponse {
  hlqtPriceCHF: Decimal;
}

export const fetchHlqtPrice = async (): Promise<HlqtPriceResponse> => {
  // https://api.coingecko.com/api/v3/simple/price?ids=hedera-liquity&vs_currencies=chf
  const response = await fetchCoinGeckoSimplePrice(["hedera-liquity"] as const, ["chf"] as const);

  return {
    hlqtPriceCHF: Decimal.from(response?.["hedera-liquity"]?.chf)
  };
};
