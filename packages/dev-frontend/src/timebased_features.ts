import { useDeployment } from "./hooks/deployments";

const twoWeeksInMs = 1.2096e9;
const sixteenWeeksInMs = 9.6768e9;

export const useTimebasedFeatures = () => {
  const deployment = useDeployment();

  if (!deployment) {
    return {
      canRedeemHchf: false,
      canStakeLp: false
    };
  }

  // enabled after 2 weeks after the deployment
  const canRedeemHchf = Date.now() > deployment.deploymentDate.getTime() + twoWeeksInMs;
  // enabled during the first 16 weeks after deployment
  const canStakeLp = Date.now() < deployment.deploymentDate.getTime() + sixteenWeeksInMs;

  return {
    canRedeemHchf,
    canStakeLp
  };
};
