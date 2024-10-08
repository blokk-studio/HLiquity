<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@liquity/lib-base](./lib-base.md) &gt; [TransactableLiquity](./lib-base.transactableliquity.md) &gt; [unstakeHLQT](./lib-base.transactableliquity.unstakehlqt.md)

## TransactableLiquity.unstakeHLQT() method

Withdraw HLQT from staking.

**Signature:**

```typescript
unstakeHLQT(amount: Decimalish): Promise<void>;
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

Amount of HLQT to withdraw.


</td></tr>
</tbody></table>
**Returns:**

Promise&lt;void&gt;

## Exceptions

Throws [TransactionFailedError](./lib-base.transactionfailederror.md) in case of transaction failure.

## Remarks

As a side-effect, the transaction will also pay out the HLQT stake's [collateral gain](./lib-base.hlqtstake.collateralgain.md) and [HCHF gain](./lib-base.hlqtstake.hchfgain.md)<!-- -->.

