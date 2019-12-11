const PoolManager = artifacts.require("./PoolManager.sol")
const CDPManager = artifacts.require("./CDPManager.sol")
const PriceFeed = artifacts.require("./PriceFeed.sol")
const CLVToken = artifacts.require("./CLVToken.sol")
const NameRegistry = artifacts.require("./NameRegistry.sol")
const ActivePool = artifacts.require("./ActivePool.sol");
const DefaultPool = artifacts.require("./DefaultPool.sol");
const StabilityPool = artifacts.require("./StabilityPool.sol")

const deploymentHelpers = require("../utils/deploymentHelpers.js")
const getAddresses = deploymentHelpers.getAddresses
const setNameRegistry = deploymentHelpers.setNameRegistry
const connectContracts = deploymentHelpers.connectContracts
const getAddressesFromNameRegistry = deploymentHelpers.getAddressesFromNameRegistry

contract('CLVToken', async accounts => {
  /* mockPool is an EOA, temporarily used to call PoolManager functions.
  TODO: Replace with a mockPool contract, and later complete transactions from EOA -> CDPManager -> PoolManager -> CLVToken.
  */

  const _1_Ether = web3.utils.toWei('1', 'ether')

  const [owner, mockPool, alice, bob, carol] = accounts;
  let priceFeed;
  let clvToken;
  let poolManager;
  let cdpManager;
  let nameRegistry;
  let activePool;
  let stabilityPool; 
  let defaultPool;
  let contractAddresses;

  describe('Basic token functions', async () => {
    beforeEach(async () => {
      priceFeed = await PriceFeed.new()
      clvToken = await CLVToken.new()
      poolManager = await PoolManager.new()
      cdpManager = await CDPManager.new()
      nameRegistry = await NameRegistry.new()
      activePool = await ActivePool.new()
      stabilityPool = await StabilityPool.new()
      defaultPool = await DefaultPool.new()

      const contracts = { priceFeed, 
                    clvToken, 
                    poolManager, 
                    cdpManager, 
                    nameRegistry, 
                    activePool, 
                    stabilityPool, 
                    defaultPool }
      
      const contractAddresses = getAddresses(contracts)
      await setNameRegistry(contractAddresses, nameRegistry, { from: owner })
      const registeredAddresses = await getAddressesFromNameRegistry(nameRegistry)

      await connectContracts(contracts, registeredAddresses)
      
      // add CDPs for three test users
      // await cdpManager.mockAddCDP({ from: alice })
      // await cdpManager.mockAddCDP({ from: bob })
      // await cdpManager.mockAddCDP({ from: carol })

      await cdpManager.addColl({ from: alice, value: _1_Ether })
      await cdpManager.addColl({ from: bob, value: _1_Ether })
      await cdpManager.addColl({ from: carol, value: _1_Ether })

      // Three test users withdraw CLV
      await cdpManager.withdrawCLV(150, { from: alice }) 
      await cdpManager.withdrawCLV(100, { from: bob })
      await cdpManager.withdrawCLV(50, { from: carol })
    })

    it('balanceOf: gets the balance of the account', async () => {
      const aliceBalance = (await clvToken.balanceOf(alice)).toNumber()
      const bobBalance = (await clvToken.balanceOf(bob)).toNumber()
      const carolBalance = (await clvToken.balanceOf(carol)).toNumber()

      assert.equal(aliceBalance, 150)
      assert.equal(bobBalance, 100)
      assert.equal(carolBalance, 50)
    })

    it('_totalSupply(): gets the total supply', async () => {
      const total = (await clvToken._totalSupply()).toNumber()
      assert.equal(total, 300)
    })

    it('setPoolAddress(): sets a new pool address', async () => {
      const newPoolManagerAddr = '0x8f0483125FCb9aaAEFA9209D8E9d7b9C8B9Fb90F'
      await clvToken.setPoolManagerAddress(newPoolManagerAddr, { from: owner })
      const poolManagerAddress = await clvToken.poolManagerAddress()
      assert.equal(newPoolManagerAddr, poolManagerAddress)
    })

    it('setName(): sets a name', async () => {
      const newName = 'token contract'
      const bytesName = web3.utils.fromUtf8(newName)
      await clvToken.setName(bytesName, { from: owner })
      const name = web3.utils.toUtf8(await clvToken.name())
      assert.equal(newName, name)
    })

    it('mint(): issues correct amount of tokens to the given address', async () => {
      await clvToken.setPoolManagerAddress(mockPool, { from: owner })

      const alice_balanceBefore = await clvToken.balanceOf(alice)
      assert.equal(alice_balanceBefore, 150)

      await clvToken.mint(alice, 100, { from: mockPool })

      const alice_BalanceAfter = await clvToken.balanceOf(alice)
      assert.equal(alice_BalanceAfter, 250)
    })

    it('burn(): burns correct amount of tokens from the given address', async () => {
      await clvToken.setPoolManagerAddress(mockPool, { from: owner })

      const alice_balanceBefore = await clvToken.balanceOf(alice)
      assert.equal(alice_balanceBefore, 150)

      await clvToken.burn(alice, 70, { from: mockPool })

      const alice_BalanceAfter = await clvToken.balanceOf(alice)
      assert.equal(alice_BalanceAfter, 80)
    })

    // TODO: Rewrite this test - it should check the actual poolManager's balance.
    it('sendToPool(): changes balances of Stability pool and user by the correct amounts', async () => {
      await clvToken.setPoolManagerAddress(mockPool, { from: owner })

      const stabilityPool_BalanceBefore = await clvToken.balanceOf(stabilityPool.address)
      const bob_BalanceBefore = await clvToken.balanceOf(bob)
      assert.equal(stabilityPool_BalanceBefore, 0)
      assert.equal(bob_BalanceBefore, 100)

      await clvToken.sendToPool(bob, stabilityPool.address, 75, { from: mockPool })

      const stabilityPool_BalanceAfter = await clvToken.balanceOf(stabilityPool.address)
      const bob_BalanceAfter = await clvToken.balanceOf(bob)
      assert.equal(stabilityPool_BalanceAfter, 75)
      assert.equal(bob_BalanceAfter, 25)
    })

    it('returnFromPool(): changes balances of Stability pool and user by the correct amounts', async () => {
      /// --- SETUP --- give pool 100 CLV
      await clvToken.setPoolManagerAddress(mockPool, { from: owner })
      await clvToken.mint(stabilityPool.address, 100, { from: mockPool })  
      
      /// --- TEST --- 
      const stabilityPool_BalanceBefore = await clvToken.balanceOf(stabilityPool.address)
      const  bob_BalanceBefore = await clvToken.balanceOf(bob)
      assert.equal(stabilityPool_BalanceBefore, 100)
      assert.equal(bob_BalanceBefore, 100)

      await clvToken.returnFromPool(stabilityPool.address, bob, 75, { from: mockPool })

      const stabilityPool_BalanceAfter = await clvToken.balanceOf(stabilityPool.address)
      const bob_BalanceAfter = await clvToken.balanceOf(bob)
      assert.equal(stabilityPool_BalanceAfter, 25)
      assert.equal(bob_BalanceAfter, 175)
    })
  })
})