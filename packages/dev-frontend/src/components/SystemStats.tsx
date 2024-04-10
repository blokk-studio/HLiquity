/** @jsxImportSource theme-ui */
import React from "react";
import { Card, Heading, Link, Box, Text } from "theme-ui";
import { AddressZero } from "@ethersproject/constants";
import { Decimal, Percent, LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";

import { useLiquity } from "../hooks/LiquityContext";
import { Statistic } from "./Statistic";
import * as l from "../lexicon";
import { COLLATERAL_COIN } from "../strings";
import { useHederaChain } from "../hedera/wagmi-chains";
import { Tooltip } from "./Tooltip";
import { TokenId } from "@hashgraph/sdk";

const selectBalances = ({ accountBalance, hchfBalance, hlqtBalance }: LiquityStoreState) => ({
  accountBalance,
  hchfBalance,
  hlqtBalance
});

const Balances: React.FC = () => {
  const { accountBalance, hchfBalance, hlqtBalance } = useLiquitySelector(selectBalances);

  return (
    <Box sx={{ mb: 3 }}>
      <Heading>My Account Balances</Heading>
      <Statistic lexicon={l.HBAR}>{accountBalance.prettify(4)}</Statistic>
      <Statistic lexicon={l.HCHF}>{hchfBalance.prettify()}</Statistic>
      <Statistic lexicon={l.HLQT}>{hlqtBalance.prettify()}</Statistic>
    </Box>
  );
};

type SystemStatsProps = {
  variant?: string;
  showBalances?: boolean;
};

const select = ({
  numberOfTroves,
  price,
  total,
  hchfInStabilityPool,
  borrowingRate,
  redemptionRate,
  totalStakedHLQT,
  frontend
}: LiquityStoreState) => ({
  numberOfTroves,
  price,
  total,
  hchfInStabilityPool,
  borrowingRate,
  redemptionRate,
  totalStakedHLQT,
  kickbackRate: frontend.status === "registered" ? frontend.kickbackRate : null
});

export const SystemStats: React.FC<SystemStatsProps> = ({ variant = "info", showBalances }) => {
  const {
    liquity: {
      connection: { version: contractsVersion, deploymentDate, frontendTag }
    }
  } = useLiquity();

  const {
    numberOfTroves,
    price,
    hchfInStabilityPool,
    total,
    borrowingRate,
    totalStakedHLQT,
    kickbackRate
  } = useLiquitySelector(select);

  const lusdInStabilityPoolPct =
    total.debt.nonZero && new Percent(hchfInStabilityPool.div(total.debt));
  const totalCollateralRatioPct = new Percent(total.collateralRatio(price));
  const borrowingFeePct = new Percent(borrowingRate);
  const kickbackRatePct = frontendTag === AddressZero ? "100" : kickbackRate?.mul(100).prettify();
  const chain = useHederaChain();

  return (
    <Card {...{ variant }}>
      {showBalances && <Balances />}

      <Heading>HLiquity statistics</Heading>

      <Heading as="h2" sx={{ mt: 3, fontWeight: "body" }}>
        Protocol
      </Heading>

      <Statistic lexicon={l.BORROW_FEE}>{borrowingFeePct.toString(2)}</Statistic>

      <Statistic lexicon={l.TVL}>
        {total.collateral?.shorten()} <Text sx={{ fontSize: 1 }}>&nbsp;{COLLATERAL_COIN}</Text>
        <Text sx={{ fontSize: 1 }}>
          &nbsp;(CHF {Decimal.from(total.collateral?.mul(price)).shorten()})
        </Text>
      </Statistic>
      <Statistic lexicon={l.TROVES}>{Decimal.from(numberOfTroves).prettify(0)}</Statistic>
      <Statistic lexicon={l.HCHF_SUPPLY}>{total.debt.shorten()}</Statistic>
      {lusdInStabilityPoolPct && (
        <Statistic lexicon={l.STABILITY_POOL_HCHF}>
          {hchfInStabilityPool.shorten()}
          <Text sx={{ fontSize: 1 }}>&nbsp;({lusdInStabilityPoolPct.toString(1)})</Text>
        </Statistic>
      )}
      <Statistic lexicon={l.STAKED_HLQT}>{totalStakedHLQT?.shorten()}</Statistic>
      <Statistic lexicon={l.TCR}>{totalCollateralRatioPct.prettify()}</Statistic>
      <Statistic lexicon={l.RECOVERY_MODE}>
        {total.collateralRatioIsBelowCritical(price) ? <Box color="danger">Yes</Box> : "No"}
      </Statistic>
      <Statistic
        lexicon={{
          term: "Price feed",
          description: (
            <>
              The price of 1 HBAR in CHF (and HCHF) as calculated by the HLiquity smart contract. The
              value is calculated in two steps based on HBAR/USDT and USD/CHF using Pyth (
              <a
                href="https://pyth.network/price-feeds/crypto-hbar-usd?range=LIVE"
                rel="noreferrer noopener"
              >
                HBAR/USD
              </a>
              ,
              <a
                href="https://pyth.network/price-feeds/fx-usd-chf?range=LIVE"
                rel="noreferrer noopener"
              >
                USD/CHF
              </a>
              ) and Supra (
              <a
                href="https://supra.com/data/catalog/details?instrumentName=hbar_usd&providerName=supra"
                rel="noreferrer noopener"
              >
                HBAR/USD
              </a>
              ,
              <a
                href="https://supra.com/data/catalog/details?instrumentName=usd_chf&providerName=supra"
                rel="noreferrer noopener"
              >
                USD/CHF
              </a>
              ).
            </>
          )
        }}
      >
        1 HBAR: {price.toString(4)} CHF
      </Statistic>

      <Heading as="h2" sx={{ mt: 3, fontWeight: "body" }}>
        Frontend
      </Heading>
      {kickbackRatePct && <Statistic lexicon={l.KICKBACK_RATE}>{kickbackRatePct}%</Statistic>}

      <Box sx={{ mt: 3, opacity: 0.66 }}>
        <Box sx={{ fontSize: 0 }}>
          Contracts version:{" "}
          {contractsVersion ? (
            <Link href={`https://github.com/SwisscoastAG/HLiquity/commit/${contractsVersion}`}>
              {contractsVersion.substring(0, 7)}
            </Link>
          ) : (
            <>unknown</>
          )}
        </Box>
        <Box sx={{ fontSize: 0 }}>Deployed: {deploymentDate.toLocaleString()}</Box>
        <Box sx={{ fontSize: 0 }}>
          Frontend version:{" "}
          {import.meta.env.VITE_APP_VERSION ? (
            <Link
              href={`https://github.com/blokk-studio/HLiquity/commit/${
                import.meta.env.VITE_APP_VERSION
              }`}
            >
              {import.meta.env.VITE_APP_VERSION.substring(0, 7)}
            </Link>
          ) : (
            <>unknown</>
          )}
        </Box>
        <Box sx={{ fontSize: 0 }}>
          HCHF Token ID:{" "}
          {chain ? (
            <Tooltip
              message={
                <Card variant="tooltip">
                  <header sx={{ fontWeight: "700", display: "block" }}>HCHF Token</header>
                  <span sx={{ display: "block" }}>
                    Hedera ID:{" "}
                    <span sx={{ fontWeight: "700" }}>
                      {TokenId.fromSolidityAddress(chain.hchfTokenId).toString()}
                    </span>
                  </span>
                  <span sx={{ display: "block" }}>
                    EVM Address: <span sx={{ fontWeight: "700" }}>{chain.hchfTokenId}</span>
                  </span>
                </Card>
              }
            >
              <span sx={{ fontWeight: "700" }}>
                {TokenId.fromSolidityAddress(chain.hchfTokenId).toString()}
              </span>
            </Tooltip>
          ) : (
            <>unknown</>
          )}
        </Box>
        <Box sx={{ fontSize: 0 }}>
          HLQT Token ID:{" "}
          {chain ? (
            <Tooltip
              message={
                <Card variant="tooltip">
                  <header sx={{ fontWeight: "700", display: "block" }}>HLQT Token</header>
                  <span sx={{ display: "block" }}>
                    Hedera ID: {TokenId.fromSolidityAddress(chain.hlqtTokenId).toString()}
                  </span>
                  <span sx={{ display: "block" }}>EVM Address: {chain.hlqtTokenId}</span>
                </Card>
              }
            >
              <span sx={{ fontWeight: "700" }}>
                {TokenId.fromSolidityAddress(chain.hlqtTokenId).toString()}
              </span>
            </Tooltip>
          ) : (
            <>unknown</>
          )}
        </Box>
      </Box>
    </Card>
  );
};
