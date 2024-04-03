<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@liquity/lib-base](./lib-base.md) &gt; [SendableLiquity](./lib-base.sendableliquity.md) &gt; [stakeHLQT](./lib-base.sendableliquity.stakehlqt.md)

## SendableLiquity.stakeHLQT() method

Stake HLQT to start earning fee revenue or increase existing stake.

<b>Signature:</b>

```typescript
stakeHLQT(amount: Decimalish): Promise<SentLiquityTransaction<S, LiquityReceipt<R, void>>>;
```

## Parameters

| Parameter | Type                                   | Description                                     |
| --------- | -------------------------------------- | ----------------------------------------------- |
| amount    | [Decimalish](./lib-base.decimalish.md) | Amount of HLQT to add to new or existing stake. |

<b>Returns:</b>

Promise&lt;[SentLiquityTransaction](./lib-base.sentliquitytransaction.md)<!-- -->&lt;S, [LiquityReceipt](./lib-base.liquityreceipt.md)<!-- -->&lt;R, void&gt;&gt;&gt;

## Remarks

As a side-effect, the transaction will also pay out an existing HLQT stake's [collateral gain](./lib-base.hlqtstake.collateralgain.md) and [HCHF gain](./lib-base.hlqtstake.hchfgain.md)<!-- -->.