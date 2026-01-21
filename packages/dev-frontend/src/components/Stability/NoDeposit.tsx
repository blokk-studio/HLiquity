import React, { useCallback } from "react";
import { Flex } from "theme-ui";
import { InfoMessage } from "../InfoMessage";
import { useStabilityView } from "./context/StabilityViewContext";
import { COIN, COLLATERAL_COIN, GT } from "../../strings";
import { HeadingWithChildren } from "../shared";
import buttons from "../../styles/buttons.module.css";

export const NoDeposit: React.FC = () => {
  const { dispatchEvent } = useStabilityView();

  const handleOpenTrove = useCallback(() => {
    dispatchEvent("DEPOSIT_PRESSED");
  }, [dispatchEvent]);

  return (
    <div>
      <HeadingWithChildren text="Stability Pool" />

      <div>
        <InfoMessage title="You have no HCHF in the Stability Pool">
          You can earn {COLLATERAL_COIN} and {GT} rewards by depositing {COIN}.
        </InfoMessage>

        <Flex variant="layout.actions">
          <button className={buttons.normal} onClick={handleOpenTrove}>Start Deposit</button>
        </Flex>
      </div>
    </div>
  )
};
