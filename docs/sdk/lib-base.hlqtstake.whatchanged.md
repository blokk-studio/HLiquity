<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@liquity/lib-base](./lib-base.md) &gt; [HLQTStake](./lib-base.hlqtstake.md) &gt; [whatChanged](./lib-base.hlqtstake.whatchanged.md)

## HLQTStake.whatChanged() method

Calculate the difference between this `HLQTStake` and `thatStakedHLQT`<!-- -->.

**Signature:**

```typescript
whatChanged(thatStakedHLQT: Decimalish): HLQTStakeChange<Decimal> | undefined;
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

thatStakedHLQT


</td><td>

[Decimalish](./lib-base.decimalish.md)


</td><td>


</td></tr>
</tbody></table>
**Returns:**

[HLQTStakeChange](./lib-base.hlqtstakechange.md)<!-- -->&lt;[Decimal](./lib-base.decimal.md)<!-- -->&gt; \| undefined

An object representing the change, or `undefined` if the staked amounts are equal.

