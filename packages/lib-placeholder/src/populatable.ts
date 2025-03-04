import { PopulatableLiquity } from '@liquity/lib-base'
import { PlaceholderLiquity } from './PlaceholderLiquity'

export const asPopulatable = (hashgraphLiquity: PlaceholderLiquity): PopulatableLiquity => {
  const sendableLiquity: PopulatableLiquity = {
    depositCollateral: hashgraphLiquity.populateDepositCollateral.bind(hashgraphLiquity),
    adjustTrove: hashgraphLiquity.populateAdjustTrove.bind(hashgraphLiquity),
    approveUniTokens: hashgraphLiquity.populateApproveUniTokens.bind(hashgraphLiquity),
    // @ts-expect-error overlapping functions, i don't get it
    borrowHCHF: hashgraphLiquity.populateBorrowHCHF.bind(hashgraphLiquity),
    claimCollateralSurplus: hashgraphLiquity.populateClaimCollateralSurplus.bind(hashgraphLiquity),
    closeTrove: hashgraphLiquity.populateCloseTrove.bind(hashgraphLiquity),
    depositHCHFInStabilityPool:
      hashgraphLiquity.populateDepositHCHFInStabilityPool.bind(hashgraphLiquity),
    exitLiquidityMining: hashgraphLiquity.populateExitLiquidityMining.bind(hashgraphLiquity),
    liquidate: hashgraphLiquity.populateLiquidate.bind(hashgraphLiquity),
    liquidateUpTo: hashgraphLiquity.populateLiquidateUpTo.bind(hashgraphLiquity),
    openTrove: hashgraphLiquity.populateOpenTrove.bind(hashgraphLiquity),
    redeemHCHF: hashgraphLiquity.populateRedeemHCHF.bind(hashgraphLiquity),
    registerFrontend: hashgraphLiquity.populateRegisterFrontend.bind(hashgraphLiquity),
    repayHCHF: hashgraphLiquity.populateRepayHCHF.bind(hashgraphLiquity),
    setPrice: hashgraphLiquity.populateSetPrice.bind(hashgraphLiquity),
    stakeHLQT: hashgraphLiquity.populateStakeHLQT.bind(hashgraphLiquity),
    stakeUniTokens: hashgraphLiquity.populateStakeUniTokens.bind(hashgraphLiquity),
    transferCollateralGainToTrove:
      hashgraphLiquity.populateTransferCollateralGainToTrove.bind(hashgraphLiquity),
    unstakeHLQT: hashgraphLiquity.populateUnstakeHLQT.bind(hashgraphLiquity),
    unstakeUniTokens: hashgraphLiquity.populateUnstakeUniTokens.bind(hashgraphLiquity),
    withdrawCollateral: hashgraphLiquity.populateWithdrawCollateral.bind(hashgraphLiquity),
    withdrawGainsFromStabilityPool:
      hashgraphLiquity.populateWithdrawGainsFromStabilityPool.bind(hashgraphLiquity),
    withdrawGainsFromStaking:
      hashgraphLiquity.populateWithdrawGainsFromStaking.bind(hashgraphLiquity),
    // @ts-expect-error overlapping functions, i don't get it
    withdrawHCHFFromStabilityPool:
      hashgraphLiquity.populateWithdrawHCHFFromStabilityPool.bind(hashgraphLiquity),
    withdrawHLQTRewardFromLiquidityMining:
      hashgraphLiquity.populateWithdrawHLQTRewardFromLiquidityMining.bind(hashgraphLiquity),
  }

  return sendableLiquity
}
