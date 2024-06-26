<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@liquity/lib-base](./lib-base.md) &gt; [TransactableLiquity](./lib-base.transactableliquity.md) &gt; [repayHCHF](./lib-base.transactableliquity.repayhchf.md)

## TransactableLiquity.repayHCHF() method

Adjust existing Trove by repaying some of its debt.

**Signature:**

```typescript
repayHCHF(amount: Decimalish): Promise<TroveAdjustmentDetails>;
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

amount


</td><td>

[Decimalish](./lib-base.decimalish.md)


</td><td>

The amount of HCHF to repay.


</td></tr>
</tbody></table>
**Returns:**

Promise&lt;[TroveAdjustmentDetails](./lib-base.troveadjustmentdetails.md)<!-- -->&gt;

## Exceptions

Throws [TransactionFailedError](./lib-base.transactionfailederror.md) in case of transaction failure.

## Remarks

Equivalent to:

```typescript
adjustTrove({ repayHCHF: amount })
```

