import { config } from '@config'
import { useCallback, useMemo } from 'react'
import { parseEther } from 'viem'
import { waitForTransactionReceipt } from 'viem/actions'

import { useWeb3Context } from '@/contexts/Web3Provider'
import {
  createErc20Contract,
  createErc20ContractInstance,
} from '@/contexts/Web3Provider/contracts'
import { getSignerOrProvider } from '@/contexts/Web3Provider/helpers/providers'
import { ErrorHandler } from '@/helpers'

/* eslint-disable no-console */
export default function Erc20() {
  const { address, client } = useWeb3Context()

  const erc20Contract = useMemo(() => {
    if (!client) return undefined

    const jsonRpcSignerOrProvider = getSignerOrProvider(client)

    return createErc20Contract(config.erc20Token, jsonRpcSignerOrProvider)
  }, [client])

  const erc20ContractInstance = useMemo(() => {
    if (!client) return undefined

    return createErc20ContractInstance(config.erc20Token, client)
  }, [client])

  const loadDetailsByEthers = useCallback(async () => {
    console.time('ethers')
    // if (!address) return

    const balance = await erc20Contract?.contractInstance.balanceOf(
      '0x22CE5fa2c98148E56b5d7e6c927811AF30B8eD9C',
    )

    console.log(balance)
    console.timeEnd('ethers')
  }, [erc20Contract])

  const loadDetailsByViem = useCallback(async () => {
    console.time('viem')
    // if (!address) return

    const viemBalance = await erc20ContractInstance?.read.balanceOf([
      '0x22CE5fa2c98148E56b5d7e6c927811AF30B8eD9C',
    ])
    console.log('balance', viemBalance)
    console.timeEnd('viem')
  }, [erc20ContractInstance?.read])

  const transferByEthers = useCallback(async () => {
    if (!address) throw new Error('no address')

    console.time('ethers transfer')

    try {
      const tx = await erc20Contract?.contractInstance.transfer(
        '0x22CE5fa2c98148E56b5d7e6c927811AF30B8eD9C',
        parseEther('1'),
      )

      const receipt = await tx?.wait()

      console.log(receipt)
    } catch (error) {
      ErrorHandler.process(error)
    }
    console.timeEnd('ethers transfer')
  }, [address, erc20Contract?.contractInstance])

  const transferByViem = useCallback(async () => {
    if (!address) throw new Error('no address')

    console.time('viem transfer')

    try {
      const hash = await erc20ContractInstance?.write.transfer([
        '0x22CE5fa2c98148E56b5d7e6c927811AF30B8eD9C',
        parseEther('1'),
      ])

      if (!hash) throw new Error('no hash')

      const receipt = await waitForTransactionReceipt(client, { hash })

      console.log(receipt)
    } catch (error) {
      ErrorHandler.process(error)
    }
    console.timeEnd('viem transfer')
  }, [address, client, erc20ContractInstance?.write])

  return (
    <div className='flex flex-col items-start gap-4'>
      <button onClick={loadDetailsByEthers}>loadDetailsByEthers</button>
      <button onClick={loadDetailsByViem}>loadDetailsByViem</button>

      <button onClick={transferByEthers}>transferByEthers</button>
      <button onClick={transferByViem}>transferByViem</button>
    </div>
  )
}
