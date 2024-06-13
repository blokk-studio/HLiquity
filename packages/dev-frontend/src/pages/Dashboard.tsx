import { Container } from "theme-ui";

import { Trove } from "../components/Trove/Trove";
import { Stability } from "../components/Stability/Stability";
import { SystemStats } from "../components/SystemStats";
import { Staking } from "../components/Staking/Staking";
import { MineViewProvider } from "../components/Mine/context/MineViewProvider";
import { Mine } from "../components/Mine/Mine";
import { RedeemHchf } from "../components/RedeemHchf/RedeemHchf";
import { useTimebasedFeatures } from "../timebased_features";

export const Dashboard: React.FC = () => {
  const { canRedeemHchf, canStakeLp } = useTimebasedFeatures();

  return (
    <Container variant="columns">
      <Container variant="left">
        <Trove />
        <Stability />
        <Staking />
        {canStakeLp && (
          <MineViewProvider>
            <Mine />
          </MineViewProvider>
        )}

        {canRedeemHchf && <RedeemHchf />}
      </Container>

      <Container variant="right">
        <SystemStats />
      </Container>
    </Container>
  );
};
