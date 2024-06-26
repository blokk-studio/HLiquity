<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@liquity/lib-base](./lib-base.md) &gt; [ReadableLiquity](./lib-base.readableliquity.md) &gt; [getCollateralSurplusBalance](./lib-base.readableliquity.getcollateralsurplusbalance.md)

## ReadableLiquity.getCollateralSurplusBalance() method

Get the amount of leftover collateral available for withdrawal by an address.

**Signature:**

```typescript
getCollateralSurplusBalance(address?: string): Promise<Decimal>;
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

string


</td><td>


</td></tr>
</tbody></table>
**Returns:**

Promise&lt;[Decimal](./lib-base.decimal.md)<!-- -->&gt;

## Remarks

When a Trove gets liquidated or redeemed, any collateral it has above 110% (in case of liquidation) or 100% collateralization (in case of redemption) gets sent to a pool, where it can be withdrawn from using [claimCollateralSurplus()](./lib-base.transactableliquity.claimcollateralsurplus.md)<!-- -->.

