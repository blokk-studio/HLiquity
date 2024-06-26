<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@liquity/lib-base](./lib-base.md) &gt; [SendableLiquity](./lib-base.sendableliquity.md) &gt; [liquidate](./lib-base.sendableliquity.liquidate.md)

## SendableLiquity.liquidate() method

Liquidate one or more undercollateralized Troves.

**Signature:**

```typescript
liquidate(address: string | string[]): Promise<SentLiquityTransaction<S, LiquityReceipt<R, LiquidationDetails>>>;
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

address


</td><td>

string \| string\[\]


</td><td>

Address or array of addresses whose Troves to liquidate.


</td></tr>
</tbody></table>
**Returns:**

Promise&lt;[SentLiquityTransaction](./lib-base.sentliquitytransaction.md)<!-- -->&lt;S, [LiquityReceipt](./lib-base.liquityreceipt.md)<!-- -->&lt;R, [LiquidationDetails](./lib-base.liquidationdetails.md)<!-- -->&gt;&gt;&gt;

