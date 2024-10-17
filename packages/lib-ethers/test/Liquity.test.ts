import chai, { expect, assert } from "chai";
import chaiAsPromised from "chai-as-promised";
import chaiSpies from "chai-spies";
import { AddressZero } from "@ethersproject/constants";
import { BigNumber } from "@ethersproject/bignumber";
import { Signer } from "@ethersproject/abstract-signer";
import { ethers, deployLiquity } from "hardhat";

import {
  Decimal,
  Decimalish,
  Trove,
  StabilityDeposit,
  LiquityReceipt,
  SuccessfulReceipt,
  SentLiquityTransaction,
  TroveCreationParams,
  Fees,
  HCHF_LIQUIDATION_RESERVE,
  MINIMUM_BORROWING_RATE,
  HCHF_MINIMUM_DEBT,
  HCHF_MINIMUM_NET_DEBT
} from "@liquity/lib-base";

import { HintHelpers } from "../types";

import { PopulatableEthersLiquity } from "../src/PopulatableEthersLiquity";

import { _LiquityDeploymentJSON } from "../src/contracts";
import { _connectToDeployment } from "../src/EthersLiquityConnection";
import { EthersLiquity } from "../src/EthersLiquity";
import { ReadableEthersLiquity } from "../src/ReadableEthersLiquity";
import dotenv from "dotenv";
import {
  AccountAllowanceApproveTransaction,
  AccountId,
  Client,
  Hbar,
  HbarUnit,
  PrivateKey,
  TokenAssociateTransaction,
  TokenId,
  TransferTransaction
} from "@hashgraph/sdk";
import axios from "axios";

const provider = ethers.provider;

chai.use(chaiAsPromised);
chai.use(chaiSpies);

dotenv.config();
const accountId = AccountId.fromString(process.env.USER_ACCOUNT_ID!);
const accountKey = PrivateKey.fromStringECDSA(process.env.USER_ACCOUNT_PRIVATE_KEY!);
const accountIdFunder = AccountId.fromString(process.env.FUNDER_ACCOUNT_ID!);
const accountKeyFunder = PrivateKey.fromStringECDSA(process.env.FUNDER_ACCOUNT_PRIVATE_KEY!);
const accountIdOtherUser = AccountId.fromString(process.env.OTHER_USER_ACCOUNT_ID!);
const accountKeyOtherUser = PrivateKey.fromStringECDSA(process.env.OTHER_USER_ACCOUNT_PRIVATE_KEY!);
const userClient = Client.forTestnet().setOperator(accountId, accountKey);
const funderClient = Client.forTestnet().setOperator(accountIdFunder, accountKeyFunder);
const otherUserClient = Client.forTestnet().setOperator(accountIdOtherUser, accountKeyOtherUser);

const connectToDeployment = async (
  deployment: _LiquityDeploymentJSON,
  signer: Signer,
  frontendTag?: string
) =>
  EthersLiquity._from(
    _connectToDeployment(deployment, signer, {
      userAddress: await signer.getAddress(),
      frontendTag
    })
  );

const increaseTime = async (timeJumpSeconds: number) => {
  await provider.send("evm_increaseTime", [timeJumpSeconds]);
};

function assertStrictEqual<T, U extends T>(
  actual: T,
  expected: U,
  message?: string
): asserts actual is U {
  assert.strictEqual(actual, expected, message);
}

function assertDefined<T>(actual: T | undefined): asserts actual is T {
  assert(actual !== undefined);
}

const waitForSuccess = async <T extends LiquityReceipt>(
  tx: Promise<SentLiquityTransaction<unknown, T>>
) => {
  const receipt = await (await tx).waitForReceipt();
  assertStrictEqual(receipt.status, "succeeded" as const);

  return receipt as Extract<T, SuccessfulReceipt>;
};

// TODO make the testcases isolated

describe("EthersLiquity", () => {
  let deployer: Signer;
  let funder: Signer;
  let user: Signer;
  let otherUsers: Signer[];

  let deployment: _LiquityDeploymentJSON;

  let deployerLiquity: EthersLiquity;
  let liquity: EthersLiquity;
  let otherLiquities: EthersLiquity[];

  const connectUsers = (users: Signer[]) =>
    Promise.all(users.map(user => connectToDeployment(deployment, user)));

  const openTroves = (users: Signer[], params: TroveCreationParams<Decimalish>[]) =>
    params
      .map(
        (params, i) => () =>
          Promise.all([
            connectToDeployment(deployment, users[i]),
            sendTo(users[i], params.depositCollateral).then(tx => tx.wait())
          ]).then(async ([liquity]) => {
            await liquity.openTrove(params, undefined, { gasPrice: 0 });
          })
      )
      .reduce((a, b) => a.then(b), Promise.resolve());

  const sendTo = (user: Signer, value: Decimalish, nonce?: number) =>
    funder.sendTransaction({
      to: user.getAddress(),
      value: Decimal.from(value).hex,
      nonce
    });

  const sendToEach = async (users: Signer[], value: Decimalish) => {
    const txCount = await provider.getTransactionCount(funder.getAddress());
    const txs = await Promise.all(users.map((user, i) => sendTo(user, value, txCount + i)));

    // Wait for the last tx to be mined.
    await txs[txs.length - 1].wait();
  };

  before(async function () {
    this.timeout(5000000);

    [deployer, funder, user, ...otherUsers] = await ethers.getSigners();
    console.log("deploy");
    try {
      //const deploymentPath = '../deployments/hederaTestnet.json';
      //deployment = await import(deploymentPath);
      deployment = await deployLiquity(deployer);
    } catch (e) {
      console.log(e);
    }
    console.log("deployment:", deployment);
    liquity = await connectToDeployment(deployment, user);
    expect(liquity).to.be.an.instanceOf(EthersLiquity);
  });

  it("should get the price", async () => {
    const price = await liquity.getPrice();
    expect(price).to.be.an.instanceOf(Decimal);
  });

  describe("findHintForCollateralRatio", () => {
    it("should pick the closest approx hint", async () => {
      type Resolved<T> = T extends Promise<infer U> ? U : never;
      type ApproxHint = Resolved<ReturnType<HintHelpers["getApproxHint"]>>;

      const fakeHints: ApproxHint[] = [
        { diff: BigNumber.from(3), hintAddress: "alice", latestRandomSeed: BigNumber.from(1111) },
        { diff: BigNumber.from(4), hintAddress: "bob", latestRandomSeed: BigNumber.from(2222) },
        { diff: BigNumber.from(1), hintAddress: "carol", latestRandomSeed: BigNumber.from(3333) },
        { diff: BigNumber.from(2), hintAddress: "dennis", latestRandomSeed: BigNumber.from(4444) }
      ];

      const borrowerOperations = {
        estimateAndPopulate: {
          openTrove: () => ({})
        }
      };

      const hintHelpers = chai.spy.interface({
        getApproxHint: () => Promise.resolve(fakeHints.shift())
      });

      const sortedTroves = chai.spy.interface({
        findInsertPosition: () => Promise.resolve(["fake insert position"])
      });

      const fakeLiquity = new PopulatableEthersLiquity({
        getNumberOfTroves: () => Promise.resolve(1000000),
        getFees: () => Promise.resolve(new Fees(0, 0.99, 1, new Date(), new Date(), false)),

        connection: {
          signerOrProvider: user,
          _contracts: {
            borrowerOperations,
            hintHelpers,
            sortedTroves
          }
        }
      } as unknown as ReadableEthersLiquity);

      const nominalCollateralRatio = Decimal.from(0.05);

      const params = Trove.recreate(new Trove(Decimal.from(1), HCHF_MINIMUM_DEBT));
      const trove = Trove.create(params);
      expect(`${trove._nominalCollateralRatio}`).to.equal(`${nominalCollateralRatio}`);

      await fakeLiquity.openTrove(params);

      expect(hintHelpers.getApproxHint).to.have.been.called.exactly(4);
      expect(hintHelpers.getApproxHint).to.have.been.called.with(nominalCollateralRatio.hex);

      // returned latestRandomSeed should be passed back on the next call
      expect(hintHelpers.getApproxHint).to.have.been.called.with(BigNumber.from(1111));
      expect(hintHelpers.getApproxHint).to.have.been.called.with(BigNumber.from(2222));
      expect(hintHelpers.getApproxHint).to.have.been.called.with(BigNumber.from(3333));

      expect(sortedTroves.findInsertPosition).to.have.been.called.once;
      expect(sortedTroves.findInsertPosition).to.have.been.called.with(
        nominalCollateralRatio.hex,
        "carol"
      );
    });
  });

  describe("Trove", () => {
    it("should have no Trove initially", async () => {
      const trove = await liquity.getTrove();
      expect(trove.isEmpty).to.be.true;
    });

    it("should fail to create an undercollateralized Trove", async () => {
      const price = await liquity.getPrice();
      const undercollateralized = new Trove(HCHF_MINIMUM_DEBT.div(price), HCHF_MINIMUM_DEBT);

      await expect(
        liquity.openTrove(Trove.recreate(undercollateralized), undefined, { gasLimit: 300000 })
      ).to.eventually.be.rejected;
    });

    it("should fail to create a Trove with too little debt", async () => {
      const withTooLittleDebt = new Trove(Decimal.from(50), HCHF_MINIMUM_DEBT.sub(1));
      await expect(liquity.openTrove(Trove.recreate(withTooLittleDebt))).to.eventually.be.rejected;
    });

    const withSomeBorrowing = { depositCollateral: 50, borrowHCHF: HCHF_MINIMUM_NET_DEBT.add(100) };

    it("should create a Trove with some borrowing", async () => {
      const tokenId = await liquity.getHCHFTokenAddress();
      const associateTx = await new TokenAssociateTransaction()
        .setAccountId(accountId)
        .setTokenIds([TokenId.fromSolidityAddress(tokenId)])
        .freezeWith(userClient)
        .sign(accountKey);
      const associateTxSubmit = await associateTx.execute(userClient);
      const associateRx = await associateTxSubmit.getReceipt(userClient);
      console.log(`Manual Association: ${associateRx.status.toString()} \n`);

      const { newTrove, fee } = await liquity.openTrove(withSomeBorrowing, undefined, {
        gasLimit: 300000
      });
      expect(newTrove).to.deep.equal(Trove.create(withSomeBorrowing));
      expect(`${fee}`).to.equal(`${MINIMUM_BORROWING_RATE.mul(withSomeBorrowing.borrowHCHF)}`);
    });

    it("should fail to withdraw all the collateral while the Trove has debt", async () => {
      const trove = await liquity.getTrove();

      await expect(liquity.withdrawCollateral(trove.collateral)).to.eventually.be.rejected;
    });

    const repaySomeDebt = { repayHCHF: 10 };

    it("should repay some debt", async () => {
      const tokenId = await liquity.getHCHFTokenAddress();
      const response = await axios.get(
        `https://testnet.mirrornode.hedera.com/api/v1/accounts/${deployment.addresses.hchfToken}`
      );
      const accountIdSpender = response.data.account;
      const amount = Hbar.from(repaySomeDebt.repayHCHF, HbarUnit.Hbar).toTinybars();

      const approveTx = await new AccountAllowanceApproveTransaction().approveTokenAllowance(
        TokenId.fromSolidityAddress(tokenId),
        accountId,
        accountIdSpender,
        amount
      );
      const signedApproveTX = await approveTx.freezeWith(userClient).sign(accountKey);
      const approveTxSubmit = await signedApproveTX.execute(userClient);
      const approveRx = await approveTxSubmit.getReceipt(userClient);
      console.log(`Manual Approval: ${approveRx.status.toString()} \n`);

      const { newTrove, fee } = await liquity.repayHCHF(repaySomeDebt.repayHCHF, {
        gasLimit: 300000
      });
      expect(newTrove).to.deep.equal(Trove.create(withSomeBorrowing).adjust(repaySomeDebt));
      expect(`${fee}`).to.equal("0");
    });

    const borrowSomeMore = { borrowHCHF: 20 };

    it("should borrow some more", async () => {
      const { newTrove, fee } = await liquity.borrowHCHF(borrowSomeMore.borrowHCHF, undefined, {
        gasLimit: 300000
      });
      expect(newTrove).to.deep.equal(
        Trove.create(withSomeBorrowing).adjust(repaySomeDebt).adjust(borrowSomeMore)
      );
      expect(`${fee}`).to.equal(`${MINIMUM_BORROWING_RATE.mul(borrowSomeMore.borrowHCHF)}`);
    });

    const depositMoreCollateral = { depositCollateral: 1 };

    it("should deposit more collateral", async () => {
      const { newTrove } = await liquity.depositCollateral(depositMoreCollateral.depositCollateral, {
        gasLimit: 300000
      });
      expect(newTrove).to.deep.equal(
        Trove.create(withSomeBorrowing)
          .adjust(repaySomeDebt)
          .adjust(borrowSomeMore)
          .adjust(depositMoreCollateral)
      );
    });

    it("should close the Trove with some HCHF from another user", async () => {
      try {
        const price = await liquity.getPrice();
        console.log("Price fetched:", price.toString());

        const initialTrove = await liquity.getTrove();
        console.log("Initial Trove:", initialTrove);

        const hchfBalance = await liquity.getHCHFBalance();
        console.log("HCHF Balance:", hchfBalance.toString());

        const hchfShortage = initialTrove.netDebt.sub(hchfBalance);
        console.log("HCHF Shortage:", hchfShortage.toString());

        let funderTrove = Trove.create({ depositCollateral: 1, borrowHCHF: hchfShortage });
        funderTrove = funderTrove.setDebt(Decimal.max(funderTrove.debt, HCHF_MINIMUM_DEBT));
        funderTrove = funderTrove.setCollateral(funderTrove.debt.mulDiv(1.51, price));

        const funderLiquity = await connectToDeployment(deployment, funder);
        console.log("Funder Liquity connected");

        const tokenId = await liquity.getHCHFTokenAddress();
        const associateTx = await new TokenAssociateTransaction()
          .setAccountId(accountIdFunder)
          .setTokenIds([TokenId.fromSolidityAddress(tokenId)])
          .freezeWith(funderClient)
          .sign(accountKeyFunder);
        const associateTxSubmit = await associateTx.execute(funderClient);
        const associateRx = await associateTxSubmit.getReceipt(funderClient);
        console.log(`Manual Association: ${associateRx.status.toString()} \n`);

        const openTroveTx = await funderLiquity.openTrove(Trove.recreate(funderTrove), undefined, {
          gasLimit: 30000000
        });
        console.log("Trove opened, transaction:", openTroveTx);

        console.log(hchfShortage);
        console.log(Number(hchfShortage.toString()));
        const transaction = await new TransferTransaction()
          .addTokenTransfer(
            TokenId.fromSolidityAddress(tokenId),
            accountIdFunder,
            -Number(hchfShortage.toString()) * 10 ** 8
          )
          .addTokenTransfer(
            TokenId.fromSolidityAddress(tokenId),
            accountId,
            Number(hchfShortage.toString()) * 10 ** 8
          )
          .freezeWith(funderClient)
          .sign(accountKeyFunder);
        const txResponse = await transaction.execute(funderClient);
        const receipt = await txResponse.getReceipt(funderClient);
        console.log(`Manual Transfer: ${receipt.status.toString()} \n`);

        const response = await axios.get(
          `https://testnet.mirrornode.hedera.com/api/v1/accounts/${deployment.addresses.hchfToken}`
        );
        const accountIdSpender = response.data.account;
        const approveTx = await new AccountAllowanceApproveTransaction().approveTokenAllowance(
          TokenId.fromSolidityAddress(tokenId),
          accountId,
          accountIdSpender,
          Hbar.from(2000, HbarUnit.Hbar).toTinybars()
        );
        const signedApproveTX = await approveTx.freezeWith(userClient).sign(accountKey);
        const approveTxSubmit = await signedApproveTX.execute(userClient);
        const approveRx = await approveTxSubmit.getReceipt(userClient);
        console.log(`Manual Approval: ${approveRx.status.toString()} \n`);

        const { params } = await liquity.closeTrove();
        console.log("Trove closed, params:", params);

        const finalTrove = await liquity.getTrove();
        console.log("Final Trove state:", finalTrove);

        expect(params).to.deep.equal({
          withdrawCollateral: initialTrove.collateral,
          repayHCHF: initialTrove.netDebt
        });
        expect(finalTrove.isEmpty).to.be.true;
      } catch (error) {
        console.error("Error during test execution:", error);
        throw error; // Re-throw the error to ensure the test fails appropriately
      }
    });
  });

  describe("SendableEthersLiquity", () => {
    it("should parse failed transactions without throwing", async () => {
      await expect(
        liquity.send.openTrove(
          {
            depositCollateral: 0.01,
            borrowHCHF: 0.01
          },
          undefined,
          { gasLimit: 3000000 }
        )
      ).to.eventually.be.fulfilled;
    });
  });

  describe("Frontend", () => {
    it("should have no frontend initially", async () => {
      const frontend = await liquity.getFrontendStatus(await user.getAddress());

      assertStrictEqual(frontend.status, "unregistered" as const);
    });

    it("should register a frontend", async () => {
      const tx = await liquity.registerFrontend(0.75);
    });

    it("should have a frontend now", async () => {
      const frontend = await liquity.getFrontendStatus(await user.getAddress());

      assertStrictEqual(frontend.status, "registered" as const);
      expect(`${frontend.kickbackRate}`).to.equal("0.75");
    });

    it("other user's deposit should be tagged with the frontend's address", async () => {
      const frontendTag = await user.getAddress();
      const tokenIdLqty = await liquity.getHLQTTokenAddress();
      const associateLqtyTx = await new TokenAssociateTransaction()
        .setAccountId(accountId)
        .setTokenIds([TokenId.fromSolidityAddress(tokenIdLqty)])
        .freezeWith(userClient)
        .sign(accountKey);
      const associateLqtyTxSubmit = await associateLqtyTx.execute(userClient);
      const associateLqtyRx = await associateLqtyTxSubmit.getReceipt(userClient);
      console.log(`Manual Association HLQT: ${associateLqtyRx.status.toString()} \n`);

      const associateLqtyUserTx = await new TokenAssociateTransaction()
        .setAccountId(accountIdOtherUser)
        .setTokenIds([TokenId.fromSolidityAddress(tokenIdLqty)])
        .freezeWith(otherUserClient)
        .sign(accountKeyOtherUser);
      const associateLqtyUserTxSubmit = await associateLqtyUserTx.execute(otherUserClient);
      const associateLqtyUserRx = await associateLqtyUserTxSubmit.getReceipt(otherUserClient);
      console.log(`Manual Association HLQT: ${associateLqtyUserRx.status.toString()} \n`);

      const tokenId = await liquity.getHCHFTokenAddress();
      const associateTx = await new TokenAssociateTransaction()
        .setAccountId(accountIdOtherUser)
        .setTokenIds([TokenId.fromSolidityAddress(tokenId)])
        .freezeWith(otherUserClient)
        .sign(accountKeyOtherUser);
      const associateTxSubmit = await associateTx.execute(otherUserClient);
      const associateRx = await associateTxSubmit.getReceipt(otherUserClient);
      console.log(`Manual Association HCHF: ${associateRx.status.toString()} \n`);

      const otherLiquity = await connectToDeployment(deployment, otherUsers[0], frontendTag);
      await otherLiquity.openTrove(
        {
          depositCollateral: 20,
          borrowHCHF: HCHF_MINIMUM_DEBT
        },
        undefined,
        { gasLimit: 300000 }
      );

      const response = await axios.get(
        `https://testnet.mirrornode.hedera.com/api/v1/accounts/${deployment.addresses.hchfToken}`
      );
      const accountIdSpender = response.data.account;
      const approveTx = await new AccountAllowanceApproveTransaction().approveTokenAllowance(
        TokenId.fromSolidityAddress(tokenId),
        accountIdOtherUser,
        accountIdSpender,
        Number(HCHF_MINIMUM_DEBT.toString()) * 10 ** 8
      );
      const signedApproveTX = await approveTx.freezeWith(otherUserClient).sign(accountKeyOtherUser);
      const approveTxSubmit = await signedApproveTX.execute(otherUserClient);
      const approveRx = await approveTxSubmit.getReceipt(otherUserClient);
      console.log(`Manual Approval: ${approveRx.status.toString()} \n`);

      await otherLiquity.depositHCHFInStabilityPool(HCHF_MINIMUM_DEBT, undefined, {
        gasLimit: 300000
      });

      const deposit = await otherLiquity.getStabilityDeposit();
      expect(deposit.frontendTag).to.equal(frontendTag);
    });
  });

  describe("StabilityPool", () => {
    before(async function () {
      this.timeout(5000000);
      deployment = await deployLiquity(deployer);

      [deployerLiquity, liquity, ...otherLiquities] = await connectUsers([
        deployer,
        user,
        ...otherUsers.slice(0, 1)
      ]);
    });

    const initialTroveOfDepositor = Trove.create({
      depositCollateral: 20,
      borrowHCHF: HCHF_MINIMUM_NET_DEBT
    });

    const smallStabilityDeposit = Decimal.from(10);

    it("should make a small stability deposit", async () => {
      const tokenId = await liquity.getHCHFTokenAddress();
      const associateTx = await new TokenAssociateTransaction()
        .setAccountId(accountId)
        .setTokenIds([TokenId.fromSolidityAddress(tokenId)])
        .freezeWith(userClient)
        .sign(accountKey);
      const associateTxSubmit = await associateTx.execute(userClient);
      const associateRx = await associateTxSubmit.getReceipt(userClient);
      console.log(`Manual Association HCHF: ${associateRx.status.toString()} \n`);

      const { newTrove } = await liquity.openTrove(
        Trove.recreate(initialTroveOfDepositor),
        undefined,
        { gasLimit: 300000 }
      );
      expect(newTrove).to.deep.equal(initialTroveOfDepositor);

      const response = await axios.get(
        `https://testnet.mirrornode.hedera.com/api/v1/accounts/${deployment.addresses.hchfToken}`
      );
      const accountIdSpender = response.data.account;
      const approveTx = await new AccountAllowanceApproveTransaction().approveTokenAllowance(
        TokenId.fromSolidityAddress(tokenId),
        accountIdOtherUser,
        accountIdSpender,
        Number(smallStabilityDeposit.toString())
      );
      const signedApproveTX = await approveTx.freezeWith(userClient).sign(accountKey);
      const approveTxSubmit = await signedApproveTX.execute(userClient);
      const approveRx = await approveTxSubmit.getReceipt(userClient);
      console.log(`Manual Approval: ${approveRx.status.toString()} \n`);

      const details = await liquity.depositHCHFInStabilityPool(smallStabilityDeposit);

      expect(details).to.deep.equal({
        hchfLoss: Decimal.from(0),
        newHCHFDeposit: smallStabilityDeposit,
        collateralGain: Decimal.from(0),
        hlqtReward: Decimal.from(0),

        change: {
          depositHCHF: smallStabilityDeposit
        }
      });
    });

    const troveWithVeryLowICR = Trove.create({
      depositCollateral: HCHF_MINIMUM_DEBT.div(180),
      borrowHCHF: HCHF_MINIMUM_NET_DEBT
    });

    it("other user should make a Trove with very low ICR", async () => {
      console.log(troveWithVeryLowICR);
      const { newTrove } = await otherLiquities[0].openTrove(
        Trove.recreate(troveWithVeryLowICR),
        undefined,
        { gasLimit: 300000 }
      );
      console.log(newTrove);
      const price = await liquity.getPrice();
      console.log(price);
      expect(Number(`${newTrove.collateralRatio(price)}`)).to.be.below(1.15);
    });

    const dippedPrice = Decimal.from(190);

    it("the price should take a dip", async () => {
      await deployerLiquity.setPrice(dippedPrice, { gasLimit: 300000 });

      const price = await liquity.getPrice();
      expect(`${price}`).to.equal(`${dippedPrice}`);
    });

    it("should liquidate other user's Trove", async () => {
      const details = await liquity.liquidateUpTo(1, { gasLimit: 300000 });

      expect(details).to.deep.equal({
        liquidatedAddresses: [await otherUsers[0].getAddress()],

        collateralGasCompensation: troveWithVeryLowICR.collateral.mul(0.005), // 0.5%
        hchfGasCompensation: HCHF_LIQUIDATION_RESERVE,

        totalLiquidated: new Trove(
          troveWithVeryLowICR.collateral
            .mul(0.995) // -0.5% gas compensation
            .add("0.00000001"), // tiny imprecision
          troveWithVeryLowICR.debt
        )
      });

      const otherTrove = await otherLiquities[0].getTrove();
      expect(otherTrove.isEmpty).to.be.true;
    });

    it("should have a depleted stability deposit and some collateral gain", async () => {
      const stabilityDeposit = await liquity.getStabilityDeposit();
      expect(stabilityDeposit).to.deep.equal(
        new StabilityDeposit(
          smallStabilityDeposit,
          Decimal.ZERO,
          troveWithVeryLowICR.collateral
            .mul(0.995) // -0.5% gas compensation
            .mulDiv(smallStabilityDeposit, troveWithVeryLowICR.debt)
            .sub("0.00000004"), // tiny imprecision
          Decimal.ZERO,
          AddressZero
        )
      );
    });

    it("the Trove should have received some liquidation shares", async () => {
      const trove = await liquity.getTrove();
      expect(trove).to.deep.equal({
        ownerAddress: await user.getAddress(),
        status: "open",

        ...initialTroveOfDepositor
          .addDebt(troveWithVeryLowICR.debt.sub(smallStabilityDeposit))
          .addCollateral(
            troveWithVeryLowICR.collateral
              .mul(0.995) // -0.5% gas compensation
              .mulDiv(troveWithVeryLowICR.debt.sub(smallStabilityDeposit), troveWithVeryLowICR.debt)
              .add("0.000000001") // tiny imprecision
          )
      });
    });

    it("total should equal the Trove", async () => {
      const trove = await liquity.getTrove();
      const numberOfTroves = await liquity.getNumberOfTroves();
      expect(numberOfTroves).to.equal(1);

      const total = await liquity.getTotal();
      expect(total).to.deep.equal(
        trove.addCollateral("0.00000002") // tiny imprecision
      );
    });

    it("should transfer the gains to the Trove", async () => {
      const details = await liquity.transferCollateralGainToTrove({ gasLimit: 300000 });

      expect(details).to.deep.equal({
        hchfLoss: smallStabilityDeposit,
        newHCHFDeposit: Decimal.ZERO,
        hlqtReward: Decimal.ZERO,

        collateralGain: troveWithVeryLowICR.collateral
          .mul(0.995) // -0.5% gas compensation
          .mulDiv(smallStabilityDeposit, troveWithVeryLowICR.debt)
          .sub("0.00000004"), // tiny imprecision

        newTrove: initialTroveOfDepositor
          .addDebt(troveWithVeryLowICR.debt.sub(smallStabilityDeposit))
          .addCollateral(
            troveWithVeryLowICR.collateral
              .mul(0.995) // -0.5% gas compensation
              .sub("0.00000005") // tiny imprecision
          )
      });

      const stabilityDeposit = await liquity.getStabilityDeposit();
      expect(stabilityDeposit.isEmpty).to.be.true;
    });

    describe("when people overstay", () => {
      before(async function () {
        this.timeout(5000000);
        // Deploy new instances of the contracts, for a clean slate
        deployment = await deployLiquity(deployer);

        const otherUsersSubset = otherUsers.slice(0, 5);
        [deployerLiquity, liquity, ...otherLiquities] = await connectUsers([
          deployer,
          user,
          ...otherUsersSubset
        ]);

        await sendToEach(otherUsersSubset, (21.1 * 10) ^ 18);

        let price = Decimal.from(200);
        await deployerLiquity.setPrice(price);

        // Use this account to print HCHF
        await liquity.openTrove({ depositCollateral: 50, borrowHCHF: 5000 }, undefined, {
          gasLimit: 300000
        });

        // TODO refactor to Hedera SDK
        // otherLiquities[0-2] will be independent stability depositors
        //await liquity.sendHCHF(await otherUsers[0].getAddress(), 3000);
        //await liquity.sendHCHF(await otherUsers[1].getAddress(), 1000);
        //await liquity.sendHCHF(await otherUsers[2].getAddress(), 1000);

        // otherLiquities[3-4] will be Trove owners whose Troves get liquidated
        await otherLiquities[3].openTrove(
          {
            depositCollateral: 21,
            borrowHCHF: 2900
          },
          undefined,
          { gasLimit: 300000 }
        );
        await otherLiquities[4].openTrove(
          {
            depositCollateral: 21,
            borrowHCHF: 2900
          },
          undefined,
          { gasLimit: 300000 }
        );

        await otherLiquities[0].depositHCHFInStabilityPool(3000, undefined, { gasLimit: 300000 });
        await otherLiquities[1].depositHCHFInStabilityPool(1000, undefined, { gasLimit: 300000 });
        // otherLiquities[2] doesn't deposit yet

        // Tank the price so we can liquidate
        price = Decimal.from(150);
        await deployerLiquity.setPrice(price);

        // Liquidate first victim
        await liquity.liquidate(await otherUsers[3].getAddress());
        expect((await otherLiquities[3].getTrove()).isEmpty).to.be.true;

        // Now otherLiquities[2] makes their deposit too
        await otherLiquities[2].depositHCHFInStabilityPool(1000, undefined, { gasLimit: 300000 });

        // Liquidate second victim
        await liquity.liquidate(await otherUsers[4].getAddress());
        expect((await otherLiquities[4].getTrove()).isEmpty).to.be.true;

        // Stability Pool is now empty
        expect(`${await liquity.getHCHFInStabilityPool()}`).to.equal("0");
      });

      it("should still be able to withdraw remaining deposit", async () => {
        for (const l of [otherLiquities[0], otherLiquities[1], otherLiquities[2]]) {
          const stabilityDeposit = await l.getStabilityDeposit();
          await l.withdrawHCHFFromStabilityPool(stabilityDeposit.currentHCHF);
        }
      });
    });
  });

  describe("Liquidity mining", () => {
    before(async function () {
      this.timeout(5000000);
      deployment = await deployLiquity(deployer);
      [deployerLiquity, liquity] = await connectUsers([deployer, user]);
    });

    const someUniTokens = 1000;

    it("should obtain some UNI LP tokens", async () => {
      await liquity._mintUniToken(someUniTokens);

      const uniTokenBalance = await liquity.getUniTokenBalance();
      expect(`${uniTokenBalance}`).to.equal(`${someUniTokens}`);
    });

    it("should fail to stake UNI LP before approving the spend", async () => {
      await expect(liquity.stakeUniTokens(someUniTokens)).to.eventually.be.rejected;
    });

    it("should stake UNI LP after approving the spend", async () => {
      const initialAllowance = await liquity.getUniTokenAllowance();
      expect(`${initialAllowance}`).to.equal("0");
      await liquity.approveUniTokens();

      const newAllowance = await liquity.getUniTokenAllowance();
      expect(newAllowance.isZero).to.be.false;
      await liquity.stakeUniTokens(someUniTokens, { gasLimit: 300000 });

      const uniTokenBalance = await liquity.getUniTokenBalance();
      expect(`${uniTokenBalance}`).to.equal("0");

      const stake = await liquity.getLiquidityMiningStake();
      expect(`${stake}`).to.equal(`${someUniTokens}`);
    });

    it("should have an HLQT reward after some time has passed", async function () {
      this.timeout("20s");

      // Liquidity mining rewards are seconds-based, so we don't need to wait long.
      // By actually waiting in real time, we avoid using increaseTime(), which only works on
      // Hardhat EVM.
      await new Promise(resolve => setTimeout(resolve, 4000));

      // Trigger a new block with a dummy TX.
      await liquity._mintUniToken(0);

      const hlqtReward = Number(await liquity.getLiquidityMiningHLQTReward());
      expect(hlqtReward).to.be.at.least(1); // ~0.2572 per second [(4e6/3) / (60*24*60*60)]

      await liquity.withdrawHLQTRewardFromLiquidityMining();
      const hlqtBalance = Number(await liquity.getHLQTBalance());
      expect(hlqtBalance).to.be.at.least(hlqtReward); // may have increased since checking
    });

    it("should partially unstake", async () => {
      await liquity.unstakeUniTokens(someUniTokens / 2, { gasLimit: 300000 });

      const uniTokenStake = await liquity.getLiquidityMiningStake();
      expect(`${uniTokenStake}`).to.equal(`${someUniTokens / 2}`);

      const uniTokenBalance = await liquity.getUniTokenBalance();
      expect(`${uniTokenBalance}`).to.equal(`${someUniTokens / 2}`);
    });

    it("should unstake remaining tokens and withdraw remaining HLQT reward", async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await liquity._mintUniToken(0); // dummy block
      await liquity.exitLiquidityMining({ gasLimit: 300000 });

      const uniTokenStake = await liquity.getLiquidityMiningStake();
      expect(`${uniTokenStake}`).to.equal("0");

      const hlqtReward = await liquity.getLiquidityMiningHLQTReward();
      expect(`${hlqtReward}`).to.equal("0");

      const uniTokenBalance = await liquity.getUniTokenBalance();
      expect(`${uniTokenBalance}`).to.equal(`${someUniTokens}`);
    });
  });
});
