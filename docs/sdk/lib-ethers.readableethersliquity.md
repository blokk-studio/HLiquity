<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@liquity/lib-ethers](./lib-ethers.md) &gt; [ReadableEthersLiquity](./lib-ethers.readableethersliquity.md)

## ReadableEthersLiquity class

Ethers-based implementation of [ReadableLiquity](./lib-base.readableliquity.md)<!-- -->.

**Signature:**

```typescript
export declare class ReadableEthersLiquity implements ReadableLiquity 
```
**Implements:** [ReadableLiquity](./lib-base.readableliquity.md)

## Remarks

The constructor for this class is marked as internal. Third-party code should not call the constructor directly or create subclasses that extend the `ReadableEthersLiquity` class.

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

[connection](./lib-ethers.readableethersliquity.connection.md)


</td><td>


</td><td>

[EthersLiquityConnection](./lib-ethers.ethersliquityconnection.md)


</td><td>


</td></tr>
<tr><td>

[constants](./lib-ethers.readableethersliquity.constants.md)


</td><td>


</td><td>

[Constants](./lib-base.constants.md)


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

[connect(options)](./lib-ethers.readableethersliquity.connect_1.md)


</td><td>

`static`


</td><td>


</td></tr>
<tr><td>

[getCollateralSurplusBalance(address, overrides)](./lib-ethers.readableethersliquity.getcollateralsurplusbalance.md)


</td><td>


</td><td>

Get the amount of leftover collateral available for withdrawal by an address.


</td></tr>
<tr><td>

[getFees(overrides)](./lib-ethers.readableethersliquity.getfees.md)


</td><td>


</td><td>

Get a calculator for current fees.


</td></tr>
<tr><td>

[getFrontendStatus(address, overrides)](./lib-ethers.readableethersliquity.getfrontendstatus.md)


</td><td>


</td><td>

Check whether an address is registered as a Liquity frontend, and what its kickback rate is.


</td></tr>
<tr><td>

[getHCHFBalance(address, overrides)](./lib-ethers.readableethersliquity.gethchfbalance.md)


</td><td>


</td><td>

Get the amount of HCHF held by an address.


</td></tr>
<tr><td>

[getHCHFInStabilityPool(overrides)](./lib-ethers.readableethersliquity.gethchfinstabilitypool.md)


</td><td>


</td><td>

Get the total amount of HCHF currently deposited in the Stability Pool.


</td></tr>
<tr><td>

[getHCHFTokenAddress(overrides)](./lib-ethers.readableethersliquity.gethchftokenaddress.md)


</td><td>


</td><td>


</td></tr>
<tr><td>

[getHchfTokenAllowanceOfHchfContract(address, overrides)](./lib-ethers.readableethersliquity.gethchftokenallowanceofhchfcontract.md)


</td><td>


</td><td>


</td></tr>
<tr><td>

[getHLQTBalance(address, overrides)](./lib-ethers.readableethersliquity.gethlqtbalance.md)


</td><td>


</td><td>

Get the amount of HLQT held by an address.


</td></tr>
<tr><td>

[getHLQTStake(address, overrides)](./lib-ethers.readableethersliquity.gethlqtstake.md)


</td><td>


</td><td>

Get the current state of an HLQT Stake.


</td></tr>
<tr><td>

[getHLQTTokenAddress(overrides)](./lib-ethers.readableethersliquity.gethlqttokenaddress.md)


</td><td>


</td><td>


</td></tr>
<tr><td>

[getHlqtTokenAllowanceOfHlqtContract(address, overrides)](./lib-ethers.readableethersliquity.gethlqttokenallowanceofhlqtcontract.md)


</td><td>


</td><td>


</td></tr>
<tr><td>

[getLiquidityMiningHLQTReward(address, overrides)](./lib-ethers.readableethersliquity.getliquiditymininghlqtreward.md)


</td><td>


</td><td>

Get the amount of HLQT earned by an address through mining liquidity.


</td></tr>
<tr><td>

[getLiquidityMiningStake(address, overrides)](./lib-ethers.readableethersliquity.getliquidityminingstake.md)


</td><td>


</td><td>

Get the amount of Uniswap ETH/HCHF LP tokens currently staked by an address in liquidity mining.


</td></tr>
<tr><td>

[getNumberOfTroves(overrides)](./lib-ethers.readableethersliquity.getnumberoftroves.md)


</td><td>


</td><td>

Get number of Troves that are currently open.


</td></tr>
<tr><td>

[getPrice(overrides)](./lib-ethers.readableethersliquity.getprice.md)


</td><td>


</td><td>

Get the current price of the native currency (e.g. Ether) in USD.


</td></tr>
<tr><td>

[getRemainingLiquidityMiningHLQTReward(overrides)](./lib-ethers.readableethersliquity.getremainingliquiditymininghlqtreward.md)


</td><td>


</td><td>

Get the remaining HLQT that will be collectively rewarded to liquidity miners.


</td></tr>
<tr><td>

[getRemainingStabilityPoolHLQTReward(overrides)](./lib-ethers.readableethersliquity.getremainingstabilitypoolhlqtreward.md)


</td><td>


</td><td>

Get the remaining HLQT that will be collectively rewarded to stability depositors.


</td></tr>
<tr><td>

[getStabilityDeposit(address, overrides)](./lib-ethers.readableethersliquity.getstabilitydeposit.md)


</td><td>


</td><td>

Get the current state of a Stability Deposit.


</td></tr>
<tr><td>

[getTotal(overrides)](./lib-ethers.readableethersliquity.gettotal.md)


</td><td>


</td><td>

Get the total amount of collateral and debt in the Liquity system.


</td></tr>
<tr><td>

[getTotalRedistributed(overrides)](./lib-ethers.readableethersliquity.gettotalredistributed.md)


</td><td>


</td><td>

Get the total collateral and debt per stake that has been liquidated through redistribution.


</td></tr>
<tr><td>

[getTotalStakedHLQT(overrides)](./lib-ethers.readableethersliquity.gettotalstakedhlqt.md)


</td><td>


</td><td>

Get the total amount of HLQT currently staked.


</td></tr>
<tr><td>

[getTotalStakedUniTokens(overrides)](./lib-ethers.readableethersliquity.gettotalstakedunitokens.md)


</td><td>


</td><td>

Get the total amount of Uniswap ETH/HCHF LP tokens currently staked in liquidity mining.


</td></tr>
<tr><td>

[getTrove(address, overrides)](./lib-ethers.readableethersliquity.gettrove.md)


</td><td>


</td><td>

Get the current state of a Trove.


</td></tr>
<tr><td>

[getTroveBeforeRedistribution(address, overrides)](./lib-ethers.readableethersliquity.gettrovebeforeredistribution.md)


</td><td>


</td><td>

Get a Trove in its state after the last direct modification.


</td></tr>
<tr><td>

[getTroves(params, overrides)](./lib-ethers.readableethersliquity.gettroves_1.md)


</td><td>


</td><td>

Get a slice from the list of Troves.


</td></tr>
<tr><td>

[getUniTokenAllowance(address, overrides)](./lib-ethers.readableethersliquity.getunitokenallowance.md)


</td><td>


</td><td>

\_CachedReadableLiquity Get the liquidity mining contract's allowance of a holder's Uniswap ETH/HCHF LP tokens.


</td></tr>
<tr><td>

[getUniTokenBalance(address, overrides)](./lib-ethers.readableethersliquity.getunitokenbalance.md)


</td><td>


</td><td>

Get the amount of Uniswap ETH/HCHF LP tokens held by an address.


</td></tr>
<tr><td>

[hasStore()](./lib-ethers.readableethersliquity.hasstore.md)


</td><td>


</td><td>

Check whether this `ReadableEthersLiquity` is a [ReadableEthersLiquityWithStore](./lib-ethers.readableethersliquitywithstore.md)<!-- -->.


</td></tr>
<tr><td>

[hasStore(store)](./lib-ethers.readableethersliquity.hasstore_1.md)


</td><td>


</td><td>

Check whether this `ReadableEthersLiquity` is a [ReadableEthersLiquityWithStore](./lib-ethers.readableethersliquitywithstore.md)<!-- -->&lt;[BlockPolledLiquityStore](./lib-ethers.blockpolledliquitystore.md)<!-- -->&gt;<!-- -->.


</td></tr>
</tbody></table>
