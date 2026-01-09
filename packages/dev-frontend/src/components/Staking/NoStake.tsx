import { Flex } from "theme-ui";

import { GT } from "../../strings";
import buttons from "../../styles/buttons.module.css";

import { InfoMessage } from "../InfoMessage";
import { useStakingView } from "./context/StakingViewContext";
import { HeadingWithChildren } from "../shared";

export const NoStake: React.FC = () => {
  const { dispatch } = useStakingView();

  return (
    <div>
      <HeadingWithChildren text="Staking" />

      <div>
        <InfoMessage title={`You haven't staked ${GT} yet.`}>
          Stake {GT} to earn a share of borrowing and redemption fees.
        </InfoMessage>

        <Flex variant="layout.actions">
          <button className={buttons.normal} onClick={() => dispatch({ type: "startAdjusting" })}>Start staking</button>
        </Flex>
      </div>
    </div>
  );
};
