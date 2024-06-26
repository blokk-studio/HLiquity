<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@liquity/lib-base](./lib-base.md) &gt; [PopulatableLiquity](./lib-base.populatableliquity.md) &gt; [stakeUniTokens](./lib-base.populatableliquity.stakeunitokens.md)

## PopulatableLiquity.stakeUniTokens() method

Stake Uniswap ETH/HCHF LP tokens to participate in liquidity mining and earn HLQT.

**Signature:**

```typescript
stakeUniTokens(amount: Decimalish): Promise<PopulatedLiquityTransaction<P, SentLiquityTransaction<S, LiquityReceipt<R, void>>>>;
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

Amount of LP tokens to add to new or existing stake.


</td></tr>
</tbody></table>
**Returns:**

Promise&lt;[PopulatedLiquityTransaction](./lib-base.populatedliquitytransaction.md)<!-- -->&lt;P, [SentLiquityTransaction](./lib-base.sentliquitytransaction.md)<!-- -->&lt;S, [LiquityReceipt](./lib-base.liquityreceipt.md)<!-- -->&lt;R, void&gt;&gt;&gt;&gt;

