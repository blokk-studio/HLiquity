import React from "react";
import { Flex, Button, Text, Spinner } from "theme-ui";
import { ActionDescription } from "../../../../../ActionDescription";
import { useBondView } from "../../../../context/BondViewContext";
import { replace, t } from "../../../../../../i18n";

export const Claim: React.FC = () => {
  const { dispatchEvent, selectedBond: bond, statuses } = useBondView();

  const isProcessingTransaction = statuses.CLAIM === "PENDING";

  const handleConfirmPressed = () => {
    dispatchEvent("CONFIRM_PRESSED");
  };

  const handleBackPressed = () => {
    dispatchEvent("BACK_PRESSED");
  };

  if (bond === undefined) return null;

  return (
    <>
      <ActionDescription>
        {replace("bonds.claimBondText", {
          bhchf: <Text sx={{ fontWeight: "bold" }}>{bond.accrued.prettify(2)} bHCHF</Text>,
          hchf: <Text sx={{ fontWeight: "bold" }}>{bond.deposit.prettify(2)} HCHF</Text>
        })}
      </ActionDescription>

      <Flex variant="layout.actions">
        <Button variant="cancel" onClick={handleBackPressed} disabled={isProcessingTransaction}>
          {t("generic.back")}
        </Button>
        <Button variant="primary" onClick={handleConfirmPressed} disabled={isProcessingTransaction}>
          {!isProcessingTransaction && <>{t("generic.confirm")}</>}
          {isProcessingTransaction && <Spinner size="28px" sx={{ color: "white" }} />}
        </Button>
      </Flex>
    </>
  );
};
