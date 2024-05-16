import { SendableLiquity } from '@liquity/lib-base'
import { HashgraphLiquity } from './HashgraphLiquity'

export const asSendable = (hashgraphLiquity: HashgraphLiquity): SendableLiquity => {
  const sendableLiquity: SendableLiquity = {
    depositCollateral: hashgraphLiquity.sendDepositCollateral.bind(hashgraphLiquity),
    adjustTrove: hashgraphLiquity.sendAdjustTrove.bind(hashgraphLiquity),
    // TODO: implement all sendable methods
    // @ts-expect-error
    approveUniTokens: () => {},
    // @ts-expect-error
    borrowHCHF: () => {},
    // @ts-expect-error
    claimCollateralSurplus: () => {},
    // @ts-expect-error
    closeTrove: () => {},
    // @ts-expect-error
    depositHCHFInStabilityPool: () => {},
    // @ts-expect-error
    exitLiquidityMining: () => {},
    // @ts-expect-error
    liquidate: () => {},
    // @ts-expect-error
    liquidateUpTo: () => {},
    // @ts-expect-error
    openTrove: () => {},
    // @ts-expect-error
    redeemHCHF: () => {},
    // @ts-expect-error
    registerFrontend: () => {},
    // @ts-expect-error
    repayHCHF: () => {},
    // @ts-expect-error
    setPrice: () => {},
    // @ts-expect-error
    stakeHLQT: () => {},
    // @ts-expect-error
    stakeUniTokens: () => {},
    // @ts-expect-error
    transferCollateralGainToTrove: () => {},
    // @ts-expect-error
    unstakeHLQT: () => {},
    // @ts-expect-error
    unstakeUniTokens: () => {},
    // @ts-expect-error
    withdrawCollateral: () => {},
    // @ts-expect-error
    withdrawGainsFromStabilityPool: () => {},
    // @ts-expect-error
    withdrawGainsFromStaking: () => {},
    // @ts-expect-error
    withdrawHCHFFromStabilityPool: () => {},
    // @ts-expect-error
    withdrawHLQTRewardFromLiquidityMining: () => {},
  }

  return sendableLiquity
}
