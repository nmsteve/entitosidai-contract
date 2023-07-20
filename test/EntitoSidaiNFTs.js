const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");


describe.only('ESidai', function (params) {

    // We define a fixture to reuse the same setup in every test.
    // We use loadFixture to run this setup once, snapshot that state,
    // and reset Hardhat Network to that snapshot in every test.
    async function deploy() {

        // Contracts are deployed using the first signer/account by default
        const [owner, user1, user2, user3, user4, user5] = await ethers.getSigners();

        this.ESidai = await ethers.getContractFactory("EntitoSidaiNFTs");
        const ESidai = await this.ESidai.deploy('https://ipfs.io/ipfs/bafkreihagbkccprqcu5t6pdx7bddkjedxtw6rkid6taoa2y3qdv4pjxola');

        return { ESidai, owner, user1, user2, user3, user4, user5 };
    }

    describe('Deployment', function () {

        it('should set owner to msg.sender', async function () {
            const { ESidai, owner } = await loadFixture(deploy)
            expect(await ESidai.owner()).to.be.equal(await owner.getAddress())
        })

        it('should set PolicyURI', async function () {
            const { ESidai, owner } = await loadFixture(deploy)
            expect(await ESidai.POLICYURI()).to.be.equal('https://ipfs.io/ipfs/bafkreihagbkccprqcu5t6pdx7bddkjedxtw6rkid6taoa2y3qdv4pjxola')
        })

        it('Should have the royalty fees set to 0%', async function () {
            const { ESidai, owner } = await loadFixture(deploy)
            const { 0: reciever, 1: amount } = await ESidai.royaltyInfo(1, ethers.utils.parseEther('100'))
            expect(amount).to.equal(ethers.utils.parseEther('0'))
            expect(reciever).to.be.eq('0x0000000000000000000000000000000000000000')

        })

    })

    describe('Setters Oparations', function () {

        it('setBaseURI', async function () {
            const { ESidai, owner } = await loadFixture(deploy)
            expect(await ESidai.setBaseURI(
                'https://goerli.etherscan.io/address/0x69e04dda9025a6d127c0e382999432b3d3a57fea#readContract/'))
                .to.emit('UpdateBaseURI()').withArgs(
                    'https://goerli.etherscan.io/address/0x69e04dda9025a6d127c0e382999432b3d3a57fea#readContract')
            await ESidai.ownerMint(owner.getAddress(), 5)
            expect(await ESidai.tokenURI(1)).to.be.eq(
                'https://goerli.etherscan.io/address/0x69e04dda9025a6d127c0e382999432b3d3a57fea#readContract/1')
        })

        it('setPublicPrice', async function () {
            const { ESidai, owner } = await loadFixture(deploy)
            expect(await ESidai.setPublicPrice(ethers.utils.parseEther('0.25'))).to.emit
            expect(await ESidai.PUBLIC_MINT_PRICE()).to.be.eqls(ethers.utils.parseEther('0.25'))
        })

        it('setMinting', async function () {
            const { ESidai } = await loadFixture(deploy)
            await ESidai.setMinting("true")
            expect(await ESidai.minting()).to.be.eqls(true)
        })

        it('Should set royalty fee', async function () {
            const { ESidai, user1 } = await loadFixture(deploy)
            await ESidai.setDefaultRoyalty(user1.getAddress(), 500)
            const { 0: reciever, 1: amount } = await ESidai.royaltyInfo(1, ethers.utils.parseEther('100'))
            expect(amount).to.equal(ethers.utils.parseEther('5'))
            expect(reciever).to.be.eq(await user1.getAddress())

        })

    })

    describe('Mint Oparations', function () {


        describe('Public Mint', function () {

            it('Should Revert if Insufficent Funds', async function () {
                const { ESidai, user1 } = await loadFixture(deploy)
                await ESidai.setPublicPrice(ethers.utils.parseEther('0.1'))
                await ESidai.setMinting('true')
                try {
                    await ESidai.connect(user1).publicMint(2, { value: ethers.utils.parseEther('0.1') })
                    // If the transaction did not revert, fail the test
                    expect.fail('Transaction did not revert');
                } catch (error) {
                    // Check if the error message matches the expected custom error message
                    expect(error.message).to.include('IncorrectETHSent()');
                }
            })

            it('Should mint if very thing is okay', async function () {
                const { ESidai, user1, user2 } = await loadFixture(deploy)
                await ESidai.setMinting('true')
                await ESidai.setPublicPrice(ethers.utils.parseEther('0.1'))
                await ESidai.connect(user1).publicMint(2, { value: ethers.utils.parseEther('0.2') })
                expect(await ESidai.totalSupply()).to.equal(2)
                expect(await ethers.provider.getBalance(ESidai.address)).to.be.equal(ethers.utils.parseEther('0.2'))

            })

            it('Should mint if higher amount is passed', async function () {
                const { ESidai, user1, user2 } = await loadFixture(deploy)
                await ESidai.setMinting('true')
                await ESidai.setPublicPrice(ethers.utils.parseEther('0.1'))
                await ESidai.connect(user1).publicMint(2, { value: ethers.utils.parseEther('0.3') })
                expect(await ESidai.totalSupply()).to.equal(2)
                expect(await ethers.provider.getBalance(ESidai.address)).to.be.equal(ethers.utils.parseEther('0.3'))

            })

            it('Should Revert if Max per wallet reached', async function () {
                const { ESidai, user1 } = await loadFixture(deploy)
                await ESidai.setPublicPrice(ethers.utils.parseEther('0.1'))
                await ESidai.setMinting('true')
                await ESidai.connect(user1).publicMint(2, { value: ethers.utils.parseEther('0.2') })

                try {
                    await ESidai.connect(user1).publicMint(1, { value: ethers.utils.parseEther('0.2') })
                    // If the transaction did not revert, fail the test
                    expect.fail('Transaction did not revert');
                } catch (error) {
                    // Check if the error message matches the expected custom error message
                    expect(error.message).to.include('ExceedsMaxPerWallet()');
                }
            })

            it('Should Revert if Max supply reached', async function () {
                const { ESidai, user1, user2, user3 } = await loadFixture(deploy)
                await ESidai.setPublicPrice(ethers.utils.parseEther('0.1'))
                await ESidai.setMinting('true')
                await ESidai.connect(user1).publicMint(2, { value: ethers.utils.parseEther('0.2') })
                await ESidai.connect(user2).publicMint(2, { value: ethers.utils.parseEther('0.2') })


                try {
                    await ESidai.connect(user3).publicMint(2, { value: ethers.utils.parseEther('0.2') })
                    // If the transaction did not revert, fail the test
                    expect.fail('Transaction did not revert');
                } catch (error) {
                    // Check if the error message matches the expected custom error message
                    expect(error.message).to.include('ExceedsMaxSupply()');
                }
            })
        })

        describe('Owner mint', function () {

            it('should mint at any stage', async function () {
                const { ESidai, owner } = await loadFixture(deploy)
                await ESidai.setMinting('true')
                const ownerAddress = await owner.getAddress()
                await ESidai.ownerMint(ownerAddress, 5)
                expect(await ESidai.balanceOf(ownerAddress)).to.be.equal(5)

            })

            it('Should not mint amount exceeding MAX_Supply', async function () {
                const { ESidai, owner } = await loadFixture(deploy)
                await ESidai.setMinting('true')
                const ownerAddress = await owner.getAddress()
                try {
                    await ESidai.ownerMint(ownerAddress, 6)
                    // If the transaction did not revert, fail the test
                    expect.fail('Transaction did not revert');
                } catch (error) {
                    expect(error.message).to.include('ExceedsMaxSupply()')

                }
            })


        })

    })

    describe('Withdraw', function () {
        it('Should withdraw funds at any time', async function () {

            const { ESidai, owner, user1, user2 } = await loadFixture(deploy)
            await ESidai.setMinting('true')
            console.log(`           Funds before mint: ${ethers.utils.formatEther(
                await ethers.provider.getBalance(ESidai.address))}`)

            //mint to have ETH

            //mint public 
            await ESidai.connect(user1).publicMint(1, { value: ethers.utils.parseEther('0.1') })
            await ESidai.connect(user2).publicMint(2, { value: ethers.utils.parseEther('0.3') })
            expect(await ethers.provider.getBalance(ESidai.address)).to.be.eq(ethers.utils.parseEther('0.4'))
            console.log(`           Funds after mint: ${ethers.utils.formatEther(
                await ethers.provider.getBalance(ESidai.address))}`)

            //withdraw
            const balBefore = await ethers.provider.getBalance(await owner.getAddress())
            await ESidai.withdraw()
            const balAfter = await ethers.provider.getBalance(await owner.getAddress())
            console.log(`           Amount expected: 0.4`)
            console.log(`           Amount collected: ${ethers.utils.formatEther((balAfter - balBefore).toString())}`)

        })

    })

    describe('Getters', function () {

        it('getNumberMinted', async function () {
            const { ESidai, user1 } = await loadFixture(deploy)

            try {
                await ESidai.connect(user1).publicMint(2, { value: ethers.utils.parseEther('0.04') })
                expect(await ESidai.getNumberMinted(user1.address)).to.be.eq(2)
            } catch (error) {
                console.error(error.message)
            }

        })

    })

})