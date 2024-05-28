import React from "react";
import { Text, Flex, Box, Heading, Button } from "theme-ui";

import { Decimal, LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";

import { COIN, COLLATERAL_COIN, GT, LP } from "../strings";

import { Icon } from "./Icon";
import { t } from "../i18n";
import { useMultiWallet } from "../multi_wallet";

const select = ({ accountBalance, hchfBalance, hlqtBalance, lpBalance }: LiquityStoreState) => ({
  accountBalance,
  hchfBalance,
  hlqtBalance,
  lpBalance
});

export const UserAccount: React.FC = () => {
  const {
    accountBalance,
    hchfBalance,
    hlqtBalance,
    lpBalance
  } = useLiquitySelector(select);
  const { addressDisplayText, disconnect } = useMultiWallet();

  return (
    <Flex>
      <Flex sx={{ alignItems: "center" }}>
        <Box>
          <Icon name="user-circle" size="lg" />
          <Text as="span" sx={{ ml: 2, fontSize: 1 }}>
            {addressDisplayText}
          </Text>
        </Box>

        <Button
          variant="outline"
          sx={{ alignItems: "center", p: 2, mr: 3 }}
          onClick={() => {
            disconnect();
          }}
          aria-label={t("userAccount.disconnectHashPack")}
          title={t("userAccount.disconnectHashPack")}
        >
          <Icon name="window-close" />
        </Button>
      </Flex>

      <Box
        sx={{
          display: ["none", "flex"],
          alignItems: "center"
        }}
      >
        <Icon name="wallet" size="lg" />

        {(
          [
            [COLLATERAL_COIN, accountBalance],
            [COIN, Decimal.from(hchfBalance || 0)],
            [GT, Decimal.from(hlqtBalance)],
            [LP, Decimal.from(lpBalance)]
          ] as const
        ).map(([currency, balance], i) => (
          <Flex key={i} sx={{ ml: 3, flexDirection: "column" }}>
            <Heading sx={{ fontSize: 1 }}>{currency}</Heading>
            <Text sx={{ fontSize: 1 }}>{balance.prettify()}</Text>
          </Flex>
        ))}
      </Box>
    </Flex>
  );
};
