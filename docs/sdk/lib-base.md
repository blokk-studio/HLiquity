<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@liquity/lib-base](./lib-base.md)

## lib-base package

## Classes

<table><thead><tr><th>

Class


</th><th>

Description


</th></tr></thead>
<tbody><tr><td>

[Decimal](./lib-base.decimal.md)


</td><td>

Fixed-point decimal bignumber with 18 digits of precision.


</td></tr>
<tr><td>

[Fees](./lib-base.fees.md)


</td><td>

Calculator for fees.


</td></tr>
<tr><td>

[HLiquityStore](./lib-base.hliquitystore.md)


</td><td>

Abstract base class of Liquity data store implementations.


</td></tr>
<tr><td>

[HLQTStake](./lib-base.hlqtstake.md)


</td><td>

Represents a user's HLQT stake and accrued gains.


</td></tr>
<tr><td>

[StabilityDeposit](./lib-base.stabilitydeposit.md)


</td><td>

A Stability Deposit and its accrued gains.


</td></tr>
<tr><td>

[TransactionFailedError](./lib-base.transactionfailederror.md)


</td><td>

Thrown by [TransactableLiquity](./lib-base.transactableliquity.md) functions in case of transaction failure.


</td></tr>
<tr><td>

[Trove](./lib-base.trove.md)


</td><td>

A combination of collateral and debt.


</td></tr>
<tr><td>

[TroveWithPendingRedistribution](./lib-base.trovewithpendingredistribution.md)


</td><td>

A Trove in its state after the last direct modification.


</td></tr>
<tr><td>

[UserTrove](./lib-base.usertrove.md)


</td><td>

A Trove that is associated with a single owner.


</td></tr>
</tbody></table>

## Interfaces

<table><thead><tr><th>

Interface


</th><th>

Description


</th></tr></thead>
<tbody><tr><td>

[CollateralGainTransferDetails](./lib-base.collateralgaintransferdetails.md)


</td><td>

Details of a [transferCollateralGainToTrove()](./lib-base.transactableliquity.transfercollateralgaintotrove.md) transaction.


</td></tr>
<tr><td>

[ConsentableLiquity](./lib-base.consentableliquity.md)


</td><td>


</td></tr>
<tr><td>

[Constants](./lib-base.constants.md)


</td><td>


</td></tr>
<tr><td>

[Deployment](./lib-base.deployment.md)


</td><td>


</td></tr>
<tr><td>

[DeploymentDefinition](./lib-base.deploymentdefinition.md)


</td><td>


</td></tr>
<tr><td>

[LiquidationDetails](./lib-base.liquidationdetails.md)


</td><td>

Details of a [liquidate()](./lib-base.transactableliquity.liquidate.md) or [liquidateUpTo()](./lib-base.transactableliquity.liquidateupto.md) transaction.


</td></tr>
<tr><td>

[LiquityStoreBaseState](./lib-base.liquitystorebasestate.md)


</td><td>

State variables read from the blockchain.


</td></tr>
<tr><td>

[LiquityStoreDerivedState](./lib-base.liquitystorederivedstate.md)


</td><td>

State variables derived from [LiquityStoreBaseState](./lib-base.liquitystorebasestate.md)<!-- -->.


</td></tr>
<tr><td>

[LiquityStoreListenerParams](./lib-base.liquitystorelistenerparams.md)


</td><td>

Parameters passed to [HLiquityStore](./lib-base.hliquitystore.md) listeners.


</td></tr>
<tr><td>

[PopulatableLiquity](./lib-base.populatableliquity.md)


</td><td>

Prepare Liquity transactions for sending.


</td></tr>
<tr><td>

[PopulatedLiquityTransaction](./lib-base.populatedliquitytransaction.md)


</td><td>

A transaction that has been prepared for sending.


</td></tr>
<tr><td>

[PopulatedRedemption](./lib-base.populatedredemption.md)


</td><td>

A redemption transaction that has been prepared for sending.


</td></tr>
<tr><td>

[ReadableLiquity](./lib-base.readableliquity.md)


</td><td>

Read the state of the Liquity protocol.


</td></tr>
<tr><td>

[RedemptionDetails](./lib-base.redemptiondetails.md)


</td><td>

Details of a [redeemHCHF()](./lib-base.transactableliquity.redeemhchf.md) transaction.


</td></tr>
<tr><td>

[SendableLiquity](./lib-base.sendableliquity.md)


</td><td>

Send Liquity transactions.


</td></tr>
<tr><td>

[SentLiquityTransaction](./lib-base.sentliquitytransaction.md)


</td><td>

A transaction that has already been sent.


</td></tr>
<tr><td>

[StabilityDepositChangeDetails](./lib-base.stabilitydepositchangedetails.md)


</td><td>

Details of a [depositHCHFInStabilityPool()](./lib-base.transactableliquity.deposithchfinstabilitypool.md) or [withdrawHCHFFromStabilityPool()](./lib-base.transactableliquity.withdrawhchffromstabilitypool.md) transaction.


</td></tr>
<tr><td>

[StabilityPoolGainsWithdrawalDetails](./lib-base.stabilitypoolgainswithdrawaldetails.md)


</td><td>

Details of a [withdrawGainsFromStabilityPool()](./lib-base.transactableliquity.withdrawgainsfromstabilitypool.md) transaction.


</td></tr>
<tr><td>

[TransactableLiquity](./lib-base.transactableliquity.md)


</td><td>

Send Liquity transactions and wait for them to succeed.


</td></tr>
<tr><td>

[TroveAdjustmentDetails](./lib-base.troveadjustmentdetails.md)


</td><td>

Details of an [adjustTrove()](./lib-base.transactableliquity.adjusttrove.md) transaction.


</td></tr>
<tr><td>

[TroveClosureDetails](./lib-base.troveclosuredetails.md)


</td><td>

Details of a [closeTrove()](./lib-base.transactableliquity.closetrove.md) transaction.


</td></tr>
<tr><td>

[TroveCreationDetails](./lib-base.trovecreationdetails.md)


</td><td>

Details of an [openTrove()](./lib-base.transactableliquity.opentrove.md) transaction.


</td></tr>
<tr><td>

[TroveListingParams](./lib-base.trovelistingparams.md)


</td><td>

Parameters of the [getTroves()](./lib-base.readableliquity.gettroves_1.md) function.


</td></tr>
</tbody></table>

## Variables

<table><thead><tr><th>

Variable


</th><th>

Description


</th></tr></thead>
<tbody><tr><td>

[defaults](./lib-base.defaults.md)


</td><td>

default valies for constants

only directly use this for tests. do not use this in application code.


</td></tr>
<tr><td>

[getConstants](./lib-base.getconstants.md)


</td><td>


</td></tr>
<tr><td>

[getConstantsFromJsonObjectString](./lib-base.getconstantsfromjsonobjectstring.md)


</td><td>


</td></tr>
<tr><td>

[getDeployment](./lib-base.getdeployment.md)


</td><td>


</td></tr>
</tbody></table>

## Type Aliases

<table><thead><tr><th>

Type Alias


</th><th>

Description


</th></tr></thead>
<tbody><tr><td>

[Address](./lib-base.address.md)


</td><td>


</td></tr>
<tr><td>

[Decimalish](./lib-base.decimalish.md)


</td><td>

Types that can be converted into a Decimal.


</td></tr>
<tr><td>

[DeploymentAddressesKey](./lib-base.deploymentaddresseskey.md)


</td><td>


</td></tr>
<tr><td>

[FailedReceipt](./lib-base.failedreceipt.md)


</td><td>

Indicates that the transaction has been mined, but it failed.


</td></tr>
<tr><td>

[FrontendStatus](./lib-base.frontendstatus.md)


</td><td>

Represents whether an address has been registered as a Liquity frontend.


</td></tr>
<tr><td>

[HLQTStakeChange](./lib-base.hlqtstakechange.md)


</td><td>

Represents the change between two states of an HLQT Stake.


</td></tr>
<tr><td>

[LiquityReceipt](./lib-base.liquityreceipt.md)


</td><td>

One of either a [PendingReceipt](./lib-base.pendingreceipt.md)<!-- -->, a [FailedReceipt](./lib-base.failedreceipt.md) or a [SuccessfulReceipt](./lib-base.successfulreceipt.md)<!-- -->.


</td></tr>
<tr><td>

[LiquityStoreState](./lib-base.liquitystorestate.md)


</td><td>

Type of [HLiquityStore](./lib-base.hliquitystore.md)<!-- -->'s [state](./lib-base.hliquitystore.state.md)<!-- -->.


</td></tr>
<tr><td>

[MinedReceipt](./lib-base.minedreceipt.md)


</td><td>

Either a [FailedReceipt](./lib-base.failedreceipt.md) or a [SuccessfulReceipt](./lib-base.successfulreceipt.md)<!-- -->.


</td></tr>
<tr><td>

[PendingReceipt](./lib-base.pendingreceipt.md)


</td><td>

Indicates that the transaction hasn't been mined yet.


</td></tr>
<tr><td>

[StabilityDepositChange](./lib-base.stabilitydepositchange.md)


</td><td>

Represents the change between two Stability Deposit states.


</td></tr>
<tr><td>

[SuccessfulReceipt](./lib-base.successfulreceipt.md)


</td><td>

Indicates that the transaction has succeeded.


</td></tr>
<tr><td>

[TroveAdjustmentParams](./lib-base.troveadjustmentparams.md)


</td><td>

Parameters of an [adjustTrove()](./lib-base.transactableliquity.adjusttrove.md) transaction.


</td></tr>
<tr><td>

[TroveChange](./lib-base.trovechange.md)


</td><td>

Represents the change between two Trove states.


</td></tr>
<tr><td>

[TroveClosureParams](./lib-base.troveclosureparams.md)


</td><td>

Parameters of a [closeTrove()](./lib-base.transactableliquity.closetrove.md) transaction.


</td></tr>
<tr><td>

[TroveCreationError](./lib-base.trovecreationerror.md)


</td><td>

Describes why a Trove could not be created.


</td></tr>
<tr><td>

[TroveCreationParams](./lib-base.trovecreationparams.md)


</td><td>

Parameters of an [openTrove()](./lib-base.transactableliquity.opentrove.md) transaction.


</td></tr>
<tr><td>

[UserTroveStatus](./lib-base.usertrovestatus.md)


</td><td>

Represents whether a UserTrove is open or not, or why it was closed.


</td></tr>
</tbody></table>
