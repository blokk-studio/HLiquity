<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@liquity/lib-ethers](./lib-ethers.md) &gt; [SendableEthersLiquity](./lib-ethers.sendableethersliquity.md)

## SendableEthersLiquity class

Ethers-based implementation of [SendableLiquity](./lib-base.sendableliquity.md)<!-- -->.

**Signature:**

```typescript
export declare class SendableEthersLiquity implements SendableLiquity<EthersTransactionReceipt, EthersTransactionResponse> 
```
**Implements:** [SendableLiquity](./lib-base.sendableliquity.md)<!-- -->&lt;[EthersTransactionReceipt](./lib-ethers.etherstransactionreceipt.md)<!-- -->, [EthersTransactionResponse](./lib-ethers.etherstransactionresponse.md)<!-- -->&gt;

## Constructors

<table><thead><tr><th>

Constructor


</th><th>

Modifiers


</th><th>

Description


</th></tr></thead>
<tbody><tr><td>

[(constructor)(populatable, store)](./lib-ethers.sendableethersliquity._constructor_.md)


</td><td>


</td><td>

Constructs a new instance of the `SendableEthersLiquity` class


</td></tr>
</tbody></table>

## Properties

<table><thead><tr><th>

Property


</th><th>

Modifiers


</th><th>

Type


</th><th>

Description


</th></tr></thead>
<tbody><tr><td>

[sendTransaction](./lib-ethers.sendableethersliquity.sendtransaction.md)


</td><td>


</td><td>

&lt;T&gt;(tx: [PopulatedEthersLiquityTransaction](./lib-ethers.populatedethersliquitytransaction.md)<!-- -->&lt;T&gt;) =&gt; Promise&lt;[SentEthersLiquityTransaction](./lib-ethers.sentethersliquitytransaction.md)<!-- -->&lt;T&gt;&gt;


</td><td>


</td></tr>
</tbody></table>

## Methods

<table><thead><tr><th>

Method


</th><th>

Modifiers


</th><th>

Description


</th></tr></thead>
<tbody><tr><td>

[adjustTrove(params, maxBorrowingRate, overrides)](./lib-ethers.sendableethersliquity.adjusttrove.md)


</td><td>


</td><td>

Adjust existing Trove by changing its collateral, debt, or both.


</td></tr>
<tr><td>

[approveUniTokens(allowance, overrides)](./lib-ethers.sendableethersliquity.approveunitokens.md)


</td><td>


</td><td>

Allow the liquidity mining contract to use Uniswap ETH/HCHF LP tokens for [staking](./lib-base.transactableliquity.stakeunitokens.md)<!-- -->.


</td></tr>
<tr><td>

[borrowHCHF(amount, maxBorrowingRate, overrides)](./lib-ethers.sendableethersliquity.borrowhchf.md)


</td><td>


</td><td>

Adjust existing Trove by borrowing more HCHF.


</td></tr>
<tr><td>

[claimCollateralSurplus(overrides)](./lib-ethers.sendableethersliquity.claimcollateralsurplus.md)


</td><td>


</td><td>

Claim leftover collateral after a liquidation or redemption.


</td></tr>
<tr><td>

[closeTrove(overrides)](./lib-ethers.sendableethersliquity.closetrove.md)


</td><td>


</td><td>

Close existing Trove by repaying all debt and withdrawing all collateral.


</td></tr>
<tr><td>

[depositCollateral(amount, overrides)](./lib-ethers.sendableethersliquity.depositcollateral.md)


</td><td>


</td><td>

Adjust existing Trove by depositing more collateral.


</td></tr>
<tr><td>

[depositHCHFInStabilityPool(amount, frontendTag, overrides)](./lib-ethers.sendableethersliquity.deposithchfinstabilitypool.md)


</td><td>


</td><td>

Make a new Stability Deposit, or top up existing one.


</td></tr>
<tr><td>

[exitLiquidityMining(overrides)](./lib-ethers.sendableethersliquity.exitliquiditymining.md)


</td><td>


</td><td>

Withdraw all staked LP tokens from liquidity mining and claim reward.


</td></tr>
<tr><td>

[liquidate(address, overrides)](./lib-ethers.sendableethersliquity.liquidate.md)


</td><td>


</td><td>

Liquidate one or more undercollateralized Troves.


</td></tr>
<tr><td>

[liquidateUpTo(maximumNumberOfTrovesToLiquidate, overrides)](./lib-ethers.sendableethersliquity.liquidateupto.md)


</td><td>


</td><td>

Liquidate the least collateralized Troves up to a maximum number.


</td></tr>
<tr><td>

[openTrove(params, maxBorrowingRate, overrides)](./lib-ethers.sendableethersliquity.opentrove.md)


</td><td>


</td><td>

Open a new Trove by depositing collateral and borrowing HCHF.


</td></tr>
<tr><td>

[redeemHCHF(amount, maxRedemptionRate, overrides)](./lib-ethers.sendableethersliquity.redeemhchf.md)


</td><td>


</td><td>

Redeem HCHF to native currency (e.g. Ether) at face value.


</td></tr>
<tr><td>

[registerFrontend(kickbackRate, overrides)](./lib-ethers.sendableethersliquity.registerfrontend.md)


</td><td>


</td><td>

Register current wallet address as a Liquity frontend.


</td></tr>
<tr><td>

[repayHCHF(amount, overrides)](./lib-ethers.sendableethersliquity.repayhchf.md)


</td><td>


</td><td>

Adjust existing Trove by repaying some of its debt.


</td></tr>
<tr><td>

[stakeHLQT(amount, overrides)](./lib-ethers.sendableethersliquity.stakehlqt.md)


</td><td>


</td><td>

Stake HLQT to start earning fee revenue or increase existing stake.


</td></tr>
<tr><td>

[stakeUniTokens(amount, overrides)](./lib-ethers.sendableethersliquity.stakeunitokens.md)


</td><td>


</td><td>

Stake Uniswap ETH/HCHF LP tokens to participate in liquidity mining and earn HLQT.


</td></tr>
<tr><td>

[transferCollateralGainToTrove(overrides)](./lib-ethers.sendableethersliquity.transfercollateralgaintotrove.md)


</td><td>


</td><td>

Transfer [collateral gain](./lib-base.stabilitydeposit.collateralgain.md) from Stability Deposit to Trove.


</td></tr>
<tr><td>

[unstakeHLQT(amount, overrides)](./lib-ethers.sendableethersliquity.unstakehlqt.md)


</td><td>


</td><td>

Withdraw HLQT from staking.


</td></tr>
<tr><td>

[unstakeUniTokens(amount, overrides)](./lib-ethers.sendableethersliquity.unstakeunitokens.md)


</td><td>


</td><td>

Withdraw Uniswap ETH/HCHF LP tokens from liquidity mining.


</td></tr>
<tr><td>

[withdrawCollateral(amount, overrides)](./lib-ethers.sendableethersliquity.withdrawcollateral.md)


</td><td>


</td><td>

Adjust existing Trove by withdrawing some of its collateral.


</td></tr>
<tr><td>

[withdrawGainsFromStabilityPool(overrides)](./lib-ethers.sendableethersliquity.withdrawgainsfromstabilitypool.md)


</td><td>


</td><td>

Withdraw [collateral gain](./lib-base.stabilitydeposit.collateralgain.md) and [HLQT reward](./lib-base.stabilitydeposit.hlqtreward.md) from Stability Deposit.


</td></tr>
<tr><td>

[withdrawGainsFromStaking(overrides)](./lib-ethers.sendableethersliquity.withdrawgainsfromstaking.md)


</td><td>


</td><td>

Withdraw [collateral gain](./lib-base.hlqtstake.collateralgain.md) and [HCHF gain](./lib-base.hlqtstake.hchfgain.md) from HLQT stake.


</td></tr>
<tr><td>

[withdrawHCHFFromStabilityPool(amount, overrides)](./lib-ethers.sendableethersliquity.withdrawhchffromstabilitypool.md)


</td><td>


</td><td>

Withdraw HCHF from Stability Deposit.


</td></tr>
<tr><td>

[withdrawHLQTRewardFromLiquidityMining(overrides)](./lib-ethers.sendableethersliquity.withdrawhlqtrewardfromliquiditymining.md)


</td><td>


</td><td>

Withdraw HLQT that has been earned by mining liquidity.


</td></tr>
</tbody></table>
