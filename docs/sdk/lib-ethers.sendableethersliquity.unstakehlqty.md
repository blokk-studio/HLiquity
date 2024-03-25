<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@liquity/lib-ethers](./lib-ethers.md) &gt; [SendableEthersLiquity](./lib-ethers.sendableethersliquity.md) &gt; [unstakeHLQTY](./lib-ethers.sendableethersliquity.unstakehlqty.md)

## SendableEthersLiquity.unstakeHLQTY() method

Withdraw HLQTY from staking.

<b>Signature:</b>

```typescript
unstakeHLQTY(amount: Decimalish, overrides?: EthersTransactionOverrides): Promise<SentEthersLiquityTransaction<void>>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  amount | [Decimalish](./lib-base.decimalish.md) | Amount of HLQTY to withdraw. |
|  overrides | [EthersTransactionOverrides](./lib-ethers.etherstransactionoverrides.md) |  |

<b>Returns:</b>

Promise&lt;[SentEthersLiquityTransaction](./lib-ethers.sentethersliquitytransaction.md)<!-- -->&lt;void&gt;&gt;

## Remarks

As a side-effect, the transaction will also pay out the HLQTY stake's [collateral gain](./lib-base.hlqtystake.collateralgain.md) and [HCHF gain](./lib-base.hlqtystake.hchfgain.md)<!-- -->.
