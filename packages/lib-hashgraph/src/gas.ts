/** Takes ~6-7K to update lastFeeOperationTime. Let's be on the safe side. */
export const gasForPotentialLastFeeOperationTimeUpdate = 10000

/** An extra traversal can take ~12K. */
export const gasForPotentialListTraversal = 25000

export const gasForHLQTIssuance = 50000

export const gasForUnipoolRewardUpdate = 20000
