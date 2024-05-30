import { Decimal } from "./Decimal";

export interface ConsentableLiquity {
  associateWithHchf(): Promise<void>;
  dissociateFromHchf(): Promise<void>;

  associateWithHlqt(): Promise<void>;
  dissociateFromHlqt(): Promise<void>;

  associateWithLpToken(): Promise<void>;
  dissociateFromLpToken(): Promise<void>;

  approveHchfToSpendHchf(amount: Decimal): Promise<void>;

  approveHlqtToSpendHlqt(amount: Decimal): Promise<void>;

  approveSaucerSwapToSpendLpToken(amount: Decimal): Promise<void>;
}
