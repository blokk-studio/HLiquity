import { Decimal } from "./Decimal";
import { Trove, TroveWithPendingRedistribution } from "./Trove";
import { StabilityDeposit } from "./StabilityDeposit";

/** @alpha */
export interface ObservableLiquity {
  watchTotalRedistributed(
    onTotalRedistributedChanged: (totalRedistributed: Trove) => void
  ): () => void;

  watchTroveWithoutRewards(
    onTroveChanged: (trove: TroveWithPendingRedistribution) => void,
    address?: string
  ): () => void;

  watchNumberOfTroves(onNumberOfTrovesChanged: (numberOfTroves: number) => void): () => void;

  watchPrice(onPriceChanged: (price: Decimal) => void): () => void;

  watchTotal(onTotalChanged: (total: Trove) => void): () => void;

  watchStabilityDeposit(
    onStabilityDepositChanged: (stabilityDeposit: StabilityDeposit) => void,
    address?: string
  ): () => void;

  watchDCHFInStabilityPool(
    onDCHFInStabilityPoolChanged: (lusdInStabilityPool: Decimal) => void
  ): () => void;

  watchDCHFBalance(onDCHFBalanceChanged: (balance: Decimal) => void, address?: string): () => void;
}
