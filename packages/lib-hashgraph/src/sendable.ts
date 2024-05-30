import {
  PopulatedLiquityTransaction,
  SendableLiquity,
  SentLiquityTransaction,
} from '@liquity/lib-base'
import { HashgraphLiquity } from './HashgraphLiquity'

const sendFromPopulate =
  <Arguments extends unknown[], SentTransactionInstance extends SentLiquityTransaction>(
    populate: (
      ...args: Arguments
    ) => Promise<PopulatedLiquityTransaction<unknown, SentTransactionInstance>>,
  ) =>
  async (...args: Arguments) => {
    const populatedTransaction = await populate(...args)
    const sentTransaction = await populatedTransaction.send()

    return sentTransaction
  }

export const asSendable = (hashgraphLiquity: HashgraphLiquity): SendableLiquity => {
  const sendableLiquity: SendableLiquity = {
    depositCollateral: sendFromPopulate(
      hashgraphLiquity.populateDepositCollateral.bind(hashgraphLiquity),
    ),
    adjustTrove: sendFromPopulate(hashgraphLiquity.populateAdjustTrove.bind(hashgraphLiquity)),
    approveUniTokens: sendFromPopulate(
      hashgraphLiquity.populateApproveUniTokens.bind(hashgraphLiquity),
    ),
    // @ts-expect-error overlapping functions, i don't get it
    borrowHCHF: sendFromPopulate(hashgraphLiquity.populateBorrowHCHF.bind(hashgraphLiquity)),
    claimCollateralSurplus: sendFromPopulate(
      hashgraphLiquity.populateClaimCollateralSurplus.bind(hashgraphLiquity),
    ),
    closeTrove: sendFromPopulate(hashgraphLiquity.populateCloseTrove.bind(hashgraphLiquity)),
    depositHCHFInStabilityPool: sendFromPopulate(
      hashgraphLiquity.populateDepositHCHFInStabilityPool.bind(hashgraphLiquity),
    ),
    exitLiquidityMining: sendFromPopulate(
      hashgraphLiquity.populateExitLiquidityMining.bind(hashgraphLiquity),
    ),
    liquidate: sendFromPopulate(hashgraphLiquity.populateLiquidate.bind(hashgraphLiquity)),
    liquidateUpTo: sendFromPopulate(hashgraphLiquity.populateLiquidateUpTo.bind(hashgraphLiquity)),
    openTrove: sendFromPopulate(hashgraphLiquity.populateOpenTrove.bind(hashgraphLiquity)),
    redeemHCHF: sendFromPopulate(hashgraphLiquity.populateRedeemHCHF.bind(hashgraphLiquity)),
    registerFrontend: sendFromPopulate(
      hashgraphLiquity.populateRegisterFrontend.bind(hashgraphLiquity),
    ),
    repayHCHF: sendFromPopulate(hashgraphLiquity.populateRepayHCHF.bind(hashgraphLiquity)),
    setPrice: sendFromPopulate(hashgraphLiquity.populateSetPrice.bind(hashgraphLiquity)),
    stakeHLQT: sendFromPopulate(hashgraphLiquity.populateStakeHLQT.bind(hashgraphLiquity)),
    stakeUniTokens: sendFromPopulate(
      hashgraphLiquity.populateStakeUniTokens.bind(hashgraphLiquity),
    ),
    transferCollateralGainToTrove: sendFromPopulate(
      hashgraphLiquity.populateTransferCollateralGainToTrove.bind(hashgraphLiquity),
    ),
    unstakeHLQT: sendFromPopulate(hashgraphLiquity.populateUnstakeHLQT.bind(hashgraphLiquity)),
    unstakeUniTokens: sendFromPopulate(
      hashgraphLiquity.populateUnstakeUniTokens.bind(hashgraphLiquity),
    ),
    withdrawCollateral: sendFromPopulate(
      hashgraphLiquity.populateWithdrawCollateral.bind(hashgraphLiquity),
    ),
    withdrawGainsFromStabilityPool: sendFromPopulate(
      hashgraphLiquity.populateWithdrawGainsFromStabilityPool.bind(hashgraphLiquity),
    ),
    withdrawGainsFromStaking: sendFromPopulate(
      hashgraphLiquity.populateWithdrawGainsFromStaking.bind(hashgraphLiquity),
    ),
    // @ts-expect-error overlapping functions, i don't get it
    withdrawHCHFFromStabilityPool: sendFromPopulate(
      hashgraphLiquity.populateWithdrawHCHFFromStabilityPool.bind(hashgraphLiquity),
    ),
    withdrawHLQTRewardFromLiquidityMining: sendFromPopulate(
      hashgraphLiquity.populateWithdrawHLQTRewardFromLiquidityMining.bind(hashgraphLiquity),
    ),
  }

  return sendableLiquity
}
