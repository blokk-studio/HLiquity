<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@liquity/lib-base](./lib-base.md) &gt; [TransactableLiquity](./lib-base.transactableliquity.md) &gt; [adjustTrove](./lib-base.transactableliquity.adjusttrove.md)

## TransactableLiquity.adjustTrove() method

Adjust existing Trove by changing its collateral, debt, or both.

**Signature:**

```typescript
adjustTrove(params: TroveAdjustmentParams<Decimalish>, maxBorrowingRate?: Decimalish): Promise<TroveAdjustmentDetails>;
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

params


</td><td>

[TroveAdjustmentParams](./lib-base.troveadjustmentparams.md)<!-- -->&lt;[Decimalish](./lib-base.decimalish.md)<!-- -->&gt;


</td><td>

Parameters of the adjustment.


</td></tr>
<tr><td>

maxBorrowingRate


</td><td>

[Decimalish](./lib-base.decimalish.md)


</td><td>

Maximum acceptable [borrowing rate](./lib-base.fees.borrowingrate.md) if `params` includes `borrowHCHF`<!-- -->.


</td></tr>
</tbody></table>
**Returns:**

Promise&lt;[TroveAdjustmentDetails](./lib-base.troveadjustmentdetails.md)<!-- -->&gt;

## Exceptions

Throws [TransactionFailedError](./lib-base.transactionfailederror.md) in case of transaction failure.

## Remarks

The transaction will fail if the Trove's debt would fall below .

If `maxBorrowingRate` is omitted, the current borrowing rate plus 0.5% is used as maximum acceptable rate.

