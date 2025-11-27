import { UserTrove } from "@liquity/lib-base";
import { useConstants } from "../../hooks/constants";
import { Card, Grid, Heading } from "theme-ui";
import { StaticRow } from "./Editor";
import { InfoIcon } from "../InfoIcon";
import { CollateralRatio } from "./CollateralRatio";
import { useCollateralRatio } from "../../hooks/useCollateralRatio";

export const CurrentUserTrove: React.FC<{
  userTrove: UserTrove;
}> = props => {
  const constants = useConstants();
  const collateralRatio = useCollateralRatio(props.userTrove);

  return (
    <Grid
      sx={{
        gridTemplateAreas: "'heading heading heading' 'debt collateral ratio'",
        marginBottom: 4
      }}
    >
      <Heading sx={{ gridArea: "heading" }}>Your Trove</Heading>
      <StaticRow
        label="Total debt"
        amount={props.userTrove.debt.prettify()}
        unit="HCHF"
        infoIcon={
          <InfoIcon
            tooltip={
              <Card variant="tooltip" sx={{ width: "240px" }}>
                The amount you borrowed ({props.userTrove.netDebt.toString()} HCHF) plus the
                liquidation reserve ({constants.HCHF_LIQUIDATION_RESERVE.toString()} HCHF).
              </Card>
            }
          />
        }
        sx={{
          gridArea: "debt"
        }}
      />
      <StaticRow
        label="Collateral"
        amount={props.userTrove.collateral.prettify()}
        unit="HBAR"
        infoIcon={
          <InfoIcon
            tooltip={
              <Card variant="tooltip" sx={{ width: "240px" }}>
                The amount of HBAR you collateralized.
              </Card>
            }
          />
        }
        sx={{
          gridArea: "collateral"
        }}
      />
      <CollateralRatio
        value={collateralRatio}
        sx={{
          gridArea: "ratio"
        }}
        infoSx={{
          gridRow: "2",
          gridColumn: "1 / 4"
        }}
      />
    </Grid>
  );
};
