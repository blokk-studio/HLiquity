import React, { useCallback } from "react";
import { Box, Flex } from "theme-ui";
import { useLiquitySelector } from "@liquity/lib-react";
import { LiquityStoreState } from "@liquity/lib-base";
import { DisabledEditableRow } from "./Editor";
import { useTroveView } from "./context/TroveViewContext";
import { Icon } from "../Icon";
import { COIN, COLLATERAL_COIN } from "../../strings";
import { CollateralRatio } from "./CollateralRatio";
import buttons from "../../styles/buttons.module.css";
import { HeadingWithChildren } from "../shared";

const select = ({ trove, price }: LiquityStoreState) => ({ trove, price });

export const ReadOnlyTrove: React.FC = () => {
  const { dispatchEvent } = useTroveView();
  const handleAdjustTrove = useCallback(() => {
    dispatchEvent("ADJUST_TROVE_PRESSED");
  }, [dispatchEvent]);
  const handleCloseTrove = useCallback(() => {
    dispatchEvent("CLOSE_TROVE_PRESSED");
  }, [dispatchEvent]);

  const { trove, price } = useLiquitySelector(select);

  // console.log("READONLY TROVE", trove.collateral.prettify(4));
  return (
    <div>
      <HeadingWithChildren text="Your Trove" />
        <Box>
          <DisabledEditableRow
            label="Collateral"
            inputId="trove-collateral"
            amount={trove.collateral.prettify()}
            unit={COLLATERAL_COIN}
          />

          <DisabledEditableRow
            label="Debt"
            inputId="trove-debt"
            amount={trove.debt.prettify()}
            unit={COIN}
          />

          <CollateralRatio value={trove.collateralRatio(price)} />
        </Box>

        <Flex variant="layout.actions">
          <button className={buttons.normal} onClick={handleAdjustTrove}>
            <Icon name="pen" size="sm" />
            &nbsp;Adjust
          </button>

          <button className={buttons.normal} onClick={handleCloseTrove}>
            Close Trove
          </button>
        </Flex>
    </div>
  );
};
