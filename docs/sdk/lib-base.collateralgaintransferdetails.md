<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@liquity/lib-base](./lib-base.md) &gt; [CollateralGainTransferDetails](./lib-base.collateralgaintransferdetails.md)

## CollateralGainTransferDetails interface

Details of a [transferCollateralGainToTrove()](./lib-base.transactableliquity.transfercollateralgaintotrove.md) transaction.

**Signature:**

```typescript
export interface CollateralGainTransferDetails extends StabilityPoolGainsWithdrawalDetails 
```
**Extends:** [StabilityPoolGainsWithdrawalDetails](./lib-base.stabilitypoolgainswithdrawaldetails.md)

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

[newTrove](./lib-base.collateralgaintransferdetails.newtrove.md)


</td><td>


</td><td>

[Trove](./lib-base.trove.md)


</td><td>

New state of the depositor's Trove directly after the transaction.


</td></tr>
</tbody></table>
