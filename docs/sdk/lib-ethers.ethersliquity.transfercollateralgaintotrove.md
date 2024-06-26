<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@liquity/lib-ethers](./lib-ethers.md) &gt; [EthersLiquity](./lib-ethers.ethersliquity.md) &gt; [transferCollateralGainToTrove](./lib-ethers.ethersliquity.transfercollateralgaintotrove.md)

## EthersLiquity.transferCollateralGainToTrove() method

Transfer [collateral gain](./lib-base.stabilitydeposit.collateralgain.md) from Stability Deposit to Trove.

**Signature:**

```typescript
transferCollateralGainToTrove(overrides?: EthersTransactionOverrides): Promise<CollateralGainTransferDetails>;
```

## Parameters

<table><thead><tr><th>

Parameter


</th><th>

Type


</th><th>

Description


</th></tr></thead>
<tbody><tr><td>

overrides


</td><td>

[EthersTransactionOverrides](./lib-ethers.etherstransactionoverrides.md)


</td><td>


</td></tr>
</tbody></table>
**Returns:**

Promise&lt;[CollateralGainTransferDetails](./lib-base.collateralgaintransferdetails.md)<!-- -->&gt;

## Exceptions

Throws [EthersTransactionFailedError](./lib-ethers.etherstransactionfailederror.md) in case of transaction failure.

## Remarks

The collateral gain is transfered to the Trove as additional collateral.

As a side-effect, the transaction will also pay out the Stability Deposit's [HLQT reward](./lib-base.stabilitydeposit.hlqtreward.md)<!-- -->.

