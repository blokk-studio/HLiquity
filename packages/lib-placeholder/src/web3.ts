import Web3 from 'web3'

export const getBlockTimestamp = async (web3: Web3, blockTag?: string | number) => {
  const block = await web3.eth.getBlock(blockTag)

  const blockTimestamp = Number(block.timestamp)

  return blockTimestamp
}
