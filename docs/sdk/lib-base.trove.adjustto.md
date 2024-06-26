<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@liquity/lib-base](./lib-base.md) &gt; [Trove](./lib-base.trove.md) &gt; [adjustTo](./lib-base.trove.adjustto.md)

## Trove.adjustTo() method

Calculate the parameters of an [adjustTrove()](./lib-base.transactableliquity.adjusttrove.md) transaction that will change this Trove into the given Trove.

**Signature:**

```typescript
adjustTo(that: Trove, borrowingRate?: Decimalish): TroveAdjustmentParams<Decimal>;
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

that


</td><td>

[Trove](./lib-base.trove.md)


</td><td>

The desired result of the transaction.


</td></tr>
<tr><td>

borrowingRate


</td><td>

[Decimalish](./lib-base.decimalish.md)


</td><td>

Current borrowing rate.


</td></tr>
</tbody></table>
**Returns:**

[TroveAdjustmentParams](./lib-base.troveadjustmentparams.md)<!-- -->&lt;[Decimal](./lib-base.decimal.md)<!-- -->&gt;

