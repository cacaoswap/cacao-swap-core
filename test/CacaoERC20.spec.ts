import { waffle, ethers, deployments, getNamedAccounts } from 'hardhat'
import { expect } from 'chai'
import { Wallet } from '@ethersproject/wallet'
import { expandTo18Decimals, getApprovalDigest, CHAIN_ID } from './shared/utilities'
import { ERC20 } from '../typechain/ERC20.d'

const TOTAL_SUPPLY = expandTo18Decimals(10000)
const TEST_AMOUNT = expandTo18Decimals(10)

describe('CacaoERC20', () => {
  let token: ERC20
  let deployer: Wallet, dev: Wallet, other: Wallet
  const { hexlify, keccak256, defaultAbiCoder, toUtf8Bytes, splitSignature } = ethers.utils
  const { MaxUint256 } = ethers.constants
  const { BigNumber } = ethers

  const fixture = async () => {
    const factory = await ethers.getContractFactory('ERC20')
    return (await factory.deploy(TOTAL_SUPPLY)) as ERC20
  }

  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>
  before('create fixture loader', async () => {
    ;[deployer, dev, other] = await (ethers as any).getSigners()
    loadFixture = waffle.createFixtureLoader([deployer])
  })

  beforeEach('deploy ERC20', async () => {
    token = await loadFixture(fixture)
  })

  it('name, symbol, decimals, totalSupply, balanceOf, DOMAIN_SEPARATOR, PERMIT_TYPEHASH', async () => {
    const name = await token.name()
    expect(name).to.eq('Cacao LPs')
    expect(await token.symbol()).to.eq('Cacao-LP')
    expect(await token.decimals()).to.eq(18)
    expect(await token.totalSupply()).to.eq(TOTAL_SUPPLY)
    expect(await token.balanceOf(deployer.address)).to.eq(TOTAL_SUPPLY)
    expect(await token.DOMAIN_SEPARATOR()).to.eq(
      keccak256(
        defaultAbiCoder.encode(
          ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
          [
            keccak256(
              toUtf8Bytes('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')
            ),
            keccak256(toUtf8Bytes(name)),
            keccak256(toUtf8Bytes('1')),
            CHAIN_ID,
            token.address,
          ]
        )
      )
    )
    expect(await token.PERMIT_TYPEHASH()).to.eq(
      keccak256(toUtf8Bytes('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)'))
    )
  })

  it('approve', async () => {
    await expect(token.approve(other.address, TEST_AMOUNT))
      .to.emit(token, 'Approval')
      .withArgs(deployer.address, other.address, TEST_AMOUNT)
    expect(await token.allowance(deployer.address, other.address)).to.eq(TEST_AMOUNT)
  })

  it('transfer', async () => {
    await expect(token.transfer(other.address, TEST_AMOUNT))
      .to.emit(token, 'Transfer')
      .withArgs(deployer.address, other.address, TEST_AMOUNT)
    expect(await token.balanceOf(deployer.address)).to.eq(TOTAL_SUPPLY.sub(TEST_AMOUNT))
    expect(await token.balanceOf(other.address)).to.eq(TEST_AMOUNT)
  })

  it('transfer:fail', async () => {
    await expect(token.transfer(other.address, TOTAL_SUPPLY.add(1))).to.be.reverted // ds-math-sub-underflow
    await expect(token.connect(other).transfer(deployer.address, 1)).to.be.reverted // ds-math-sub-underflow
  })

  it('transferFrom', async () => {
    await token.approve(other.address, TEST_AMOUNT)
    await expect(token.connect(other).transferFrom(deployer.address, other.address, TEST_AMOUNT))
      .to.emit(token, 'Transfer')
      .withArgs(deployer.address, other.address, TEST_AMOUNT)
    expect(await token.allowance(deployer.address, other.address)).to.eq(0)
    expect(await token.balanceOf(deployer.address)).to.eq(TOTAL_SUPPLY.sub(TEST_AMOUNT))
    expect(await token.balanceOf(other.address)).to.eq(TEST_AMOUNT)
  })

  it('transferFrom:max', async () => {
    await token.approve(other.address, MaxUint256)
    await expect(token.connect(other).transferFrom(deployer.address, other.address, TEST_AMOUNT))
      .to.emit(token, 'Transfer')
      .withArgs(deployer.address, other.address, TEST_AMOUNT)
    expect(await token.allowance(deployer.address, other.address)).to.eq(MaxUint256)
    expect(await token.balanceOf(deployer.address)).to.eq(TOTAL_SUPPLY.sub(TEST_AMOUNT))
    expect(await token.balanceOf(other.address)).to.eq(TEST_AMOUNT)
  })

  it('permit', async () => {
    const nonce = await token.nonces(deployer.address)
    const deadline = MaxUint256
    const digest = await getApprovalDigest(
      token,
      { owner: deployer.address, spender: other.address, value: TEST_AMOUNT },
      nonce,
      deadline
    )
    const domain = {
      name: 'Cacao LPs',
      version: '1',
      chainId: CHAIN_ID,
      verifyingContract: token.address,
    }
    const types = {
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    }
    const signedMessage = await deployer._signTypedData(domain, types, {
      owner: deployer.address,
      spender: other.address,
      value: TEST_AMOUNT,
      nonce: nonce,
      deadline: deadline,
    })
    const { v, r, s } = splitSignature(signedMessage)
    await expect(token.permit(deployer.address, other.address, TEST_AMOUNT, deadline, v, hexlify(r), hexlify(s)))
      .to.emit(token, 'Approval')
      .withArgs(deployer.address, other.address, TEST_AMOUNT)
    expect(await token.allowance(deployer.address, other.address)).to.eq(TEST_AMOUNT)
    expect(await token.nonces(deployer.address)).to.eq(BigNumber.from(1))
  })
})
