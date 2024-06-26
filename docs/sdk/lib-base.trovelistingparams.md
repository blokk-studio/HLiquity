<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@liquity/lib-base](./lib-base.md) &gt; [TroveListingParams](./lib-base.trovelistingparams.md)

## TroveListingParams interface

Parameters of the [getTroves()](./lib-base.readableliquity.gettroves_1.md) function.

**Signature:**

```typescript
export interface TroveListingParams 
```

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

[beforeRedistribution?](./lib-base.trovelistingparams.beforeredistribution.md)


</td><td>


</td><td>

boolean


</td><td>

_(Optional)_ When set to `true`<!-- -->, the retrieved Troves won't include the liquidation shares received since the last time they were directly modified.


</td></tr>
<tr><td>

[first](./lib-base.trovelistingparams.first.md)


</td><td>


</td><td>

number


</td><td>

Number of Troves to retrieve.


</td></tr>
<tr><td>

[sortedBy](./lib-base.trovelistingparams.sortedby.md)


</td><td>


</td><td>

"ascendingCollateralRatio" \| "descendingCollateralRatio"


</td><td>

How the Troves should be sorted.


</td></tr>
<tr><td>

[startingAt?](./lib-base.trovelistingparams.startingat.md)


</td><td>


</td><td>

number


</td><td>

_(Optional)_ Index of the first Trove to retrieve from the sorted list.


</td></tr>
</tbody></table>
