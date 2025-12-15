import React from "react";
import { Text, Flex, Box, Heading, Button } from "theme-ui";

import { Decimal } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";

import { COIN, COLLATERAL_COIN, GT, LP } from "../strings";

import { Icon } from "./Icon";
import { t } from "../i18n";
import { useMultiWallet } from "../multi_wallet";

import buttonStyles from '../styles/buttons.module.css'

export const UserAccount: React.FC = () => {
  const { accountBalance, hchfBalance, hlqtBalance, uniTokenBalance } = useLiquitySelector(
    state => state
  );
  const { hasConnection, addressDisplayText, disconnect, showConnectionDialog } = useMultiWallet();

  return (
    <Flex>
      {!hasConnection ? (
        <button className={buttonStyles.normal} onClick={showConnectionDialog}>Connect wallet</button>
      ) : (
        <>
          <Flex sx={{ alignItems: "center" }}>
            <Box>
              <Icon name="user-circle" size="lg" />
              <Text as="span" sx={{ ml: 2, fontSize: 1 }}>
                {addressDisplayText}
              </Text>
            </Box>

            <Button
              variant="icon"
              sx={{ alignItems: "center", p: 2, mr: 3 }}
              onClick={() => {
                disconnect();
              }}
              aria-label={t("userAccount.disconnectWallet")}
              title={t("userAccount.disconnectWallet")}
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
                [LP, Decimal.from(uniTokenBalance)]
              ] as const
            ).map(([currency, balance], i) => (
              <Flex key={i} sx={{ ml: 3, flexDirection: "column" }}>
                <Heading sx={{ fontSize: 1 }}>{currency}</Heading>
                <Text sx={{ fontSize: 1 }}>{balance.prettify()}</Text>
              </Flex>
            ))}
          </Box>
        </>
      )}
    </Flex>
  );
};
