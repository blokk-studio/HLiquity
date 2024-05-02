import React from "react";
import { Text, Flex, Box, Heading, Button } from "theme-ui";

import { Decimal, LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";

import { COIN, COLLATERAL_COIN, GT } from "../strings";
import { useLiquity } from "../hooks/LiquityContext";
import { shortenAddress } from "../utils/shortenAddress";

import { Icon } from "./Icon";
import { useBondView } from "./Bonds/context/BondViewContext";
import { useBondAddresses } from "./Bonds/context/BondAddressesContext";
// import { ConnectKitButton } from "connectkit";

const select = ({ accountBalance, hchfBalance, hlqtBalance }: LiquityStoreState) => ({
  accountBalance,
  hchfBalance,
  hlqtBalance
});

export const UserAccount: React.FC = () => {
  const { account } = useLiquity();
  const { accountBalance, hchfBalance: realHchfBalance, hlqtBalance } = useLiquitySelector(select);
  const { hchfBalance: customHchfBalance } = useBondView();
  const { LUSD_OVERRIDE_ADDRESS } = useBondAddresses();

  const hchfBalance = LUSD_OVERRIDE_ADDRESS === null ? realHchfBalance : customHchfBalance;

  return (
    <Flex>
      {/* <ConnectKitButton.Custom>
        {connectKit => (
          <Button
            variant="outline"
            sx={{ alignItems: "center", p: 2, mr: 3 }}
            onClick={connectKit.show}
          >
            <Icon name="user-circle" size="lg" />
            <Text as="span" sx={{ ml: 2, fontSize: 1 }}>
              {shortenAddress(account)}
            </Text>
          </Button>
        )}
      </ConnectKitButton.Custom> */}

      <Box
        sx={{
          display: ["none", "flex"],
          alignItems: "center"
        }}
      >
        <Icon name="wallet" size="lg" />

        {([
          [COLLATERAL_COIN, accountBalance],
          [COIN, Decimal.from(hchfBalance || 0)],
          [GT, Decimal.from(hlqtBalance)]
        ] as const).map(([currency, balance], i) => (
          <Flex key={i} sx={{ ml: 3, flexDirection: "column" }}>
            <Heading sx={{ fontSize: 1 }}>{currency}</Heading>
            <Text sx={{ fontSize: 1 }}>{balance.prettify()}</Text>
          </Flex>
        ))}
      </Box>
    </Flex>
  );
};
