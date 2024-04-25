/** @jsxImportSource theme-ui */
import React from "react";
import { Flex, Heading, Grid, Close, Box } from "theme-ui";
import { Record } from "../../Record";
import { useBondView } from "../../context/BondViewContext";
import { HorizontalTimeline, Label, SubLabel } from "../../../HorizontalTimeline";
import type { EventType } from "../../../HorizontalTimeline";
import { Cancel } from "./actions/cancel/Cancel";
import { Claim } from "./actions/claim/Claim";
import { Warning } from "../../../Warning";
import { ReactModal } from "../../../ReactModal";
import { percentify } from "../../utils";
import { Decimal } from "@liquity/lib-base";
import { InfiniteEstimate } from "../InfiniteEstimation";
import { t } from "../../../../i18n";

export const Actioning: React.FC = () => {
  const { dispatchEvent, view, selectedBond: bond } = useBondView();

  const handleDismiss = () => {
    dispatchEvent("ABORT_PRESSED");
  };

  if (bond === undefined) return null;

  let Actions;
  switch (view) {
    case "CANCELLING": {
      Actions = <Cancel />;
      break;
    }
    case "CLAIMING": {
      Actions = <Claim />;
      break;
    }
  }

  const events: EventType[] = [
    {
      date: new Date(bond.startTime),
      label: (
        <>
          <Label description={t("bonds.bondCreated.description")}>
            {t("bonds.bondCreated.term")}
          </Label>
          <SubLabel>{`0 bHCHF`}</SubLabel>
        </>
      )
    },
    {
      date: new Date(bond.breakEvenTime),
      label: (
        <>
          <Label description={t("bonds.breakEvenTime.description")}>
            {t("bonds.breakEvenTime.term")}
          </Label>
          <SubLabel>
            <InfiniteEstimate estimate={bond.breakEvenAccrual}>
              {bond.breakEvenAccrual.prettify(2)} bHCHF
            </InfiniteEstimate>
          </SubLabel>
        </>
      )
    },
    {
      date: new Date(bond.rebondTime),
      label: (
        <>
          <Label description={t("bonds.optimumRebondTime.description")}>
            {t("bonds.optimumRebondTime.term")}
          </Label>
          <SubLabel>
            <InfiniteEstimate estimate={bond.rebondAccrual}>
              {bond.rebondAccrual.prettify(2)} bHCHF
            </InfiniteEstimate>
          </SubLabel>
        </>
      )
    },
    {
      date: new Date(Date.now()),
      label: (
        <>
          <Label description={t("lexicon.accruedAmount.description")} style={{ fontWeight: 500 }}>
            {t("lexicon.accruedAmount.term")}
          </Label>
          <SubLabel style={{ fontWeight: 400 }}>{`${bond.accrued.prettify(2)} bHCHF`}</SubLabel>
        </>
      ),
      isEndOfLife: true,
      isMilestone: false
    }
  ];

  return (
    <ReactModal onDismiss={handleDismiss}>
      <Heading as="h2" sx={{ pt: 2, pb: 3, px: 2 }}>
        <Flex sx={{ justifyContent: "center" }}>
          {view === "CANCELLING" ? t("lexicon.cancelBond.term") : t("lexicon.claimBond.term")}
        </Flex>
        <Close
          onClick={handleDismiss}
          sx={{
            position: "absolute",
            right: "24px",
            top: "24px"
          }}
        />
      </Heading>
      <Flex my={4} mx={2} sx={{ justifyContent: "center" }}>
        <HorizontalTimeline events={events} />
      </Flex>
      <Grid gap="12px" columns={3} sx={{ my: 4, justifyItems: "center" }}>
        <Record
          lexicon={t("lexicon.bondDeposit", { returnObjects: true })}
          value={bond.deposit.prettify(2)}
          type="HCHF"
        />

        <Record
          lexicon={t("lexicon.marketValue", { returnObjects: true })}
          value={bond.marketValue.prettify(2)}
          type="HCHF"
        />

        {view === "CLAIMING" && (
          <Record
            lexicon={t("lexicon.bondReturn", { returnObjects: true })}
            value={bond.claimNowReturn.toFixed(2)}
            type="HCHF"
          />
        )}
      </Grid>
      <details>
        <summary sx={{ pl: 2, mt: 4, cursor: "pointer" }}>{t("bonds.rebondEstimations")}</summary>
        <Grid gap="20px" columns={3} sx={{ my: 2, justifyItems: "center" }}>
          <Record
            lexicon={t("lexicon.rebondReturn", { returnObjects: true })}
            value={bond.rebondAccrual.eq(Decimal.INFINITY) ? "N/A" : bond.rebondReturn.toFixed(2)}
            type="HCHF"
          />

          <Record
            lexicon={t("lexicon.rebondTimeRoi", { returnObjects: true })}
            value={
              bond.rebondAccrual.eq(Decimal.INFINITY)
                ? "N/A"
                : percentify(bond.rebondRoi).toFixed(2) + "%"
            }
          />

          <Record
            lexicon={t("lexicon.optimumApy", { returnObjects: true })}
            value={
              bond.rebondAccrual.eq(Decimal.INFINITY)
                ? "N/A"
                : percentify(bond.rebondApr).toFixed(2) + "%"
            }
          />
        </Grid>
      </details>

      <Box mt={3}>
        {view === "CLAIMING" && bond.claimNowReturn < 0 && (
          <Warning>{t("bonds.claimingNegativeReturnWarning")}</Warning>
        )}
        {view === "CANCELLING" && bond.accrued.gte(bond.breakEvenAccrual) && (
          <Warning>{t("bonds.cancellingPositiveReturnWarning")}</Warning>
        )}
      </Box>

      {Actions}
    </ReactModal>
  );
};
