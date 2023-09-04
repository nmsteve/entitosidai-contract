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
        const ESidai = await this.ESidai.deploy();

        return { ESidai, owner, user1, user2, user3, user4, user5 };
    }

    describe('Deployment', function () {

        it('Set owner to msg.sender', async function () {
            const { ESidai, owner } = await loadFixture(deploy)
            expect(await ESidai.owner()).to.be.equal(await owner.getAddress())
        })

        it('Set PolicyURI', async function () {
            const { ESidai, owner } = await loadFixture(deploy)
            expect(await ESidai.POLICYURI()).to.be.equal('https://ipfs.io/ipfs/bafkreif3iv35ssght6d24bzyq7mslxmrrlilgy2nbyohzop74hvluv5mqe')
        })

        it('Set royalty fees set to 0%', async function () {
            const { ESidai, owner } = await loadFixture(deploy)
            const { 0: reciever, 1: amount } = await ESidai.royaltyInfo(1, ethers.utils.parseEther('100'))
            expect(amount).to.equal(ethers.utils.parseEther('0'))
            expect(reciever).to.be.eq('0x0000000000000000000000000000000000000000')

        })

    })

    describe('Setters Oparations', function () {

        it('setBaseURI', async function () {
            const { ESidai, owner, user1 } = await loadFixture(deploy)
            expect(await ESidai.setBaseURI(
                'https://goerli.etherscan.io/'))
                .to.emit('UpdateBaseURI()').withArgs(
                    'https://goerli.etherscan.io/')
            await ESidai.ownerMint(owner.getAddress(), 5)
            expect(await ESidai.tokenURI(1)).to.be.eq(
                'https://goerli.etherscan.io/1')

            //Revert if not owner 
            await expect(ESidai.connect(user1).setBaseURI('https://goerli.etherscan.io/')).to.be
                .revertedWith("Ownable: caller is not the owner")


        })

        it('setPublicPrice', async function () {
            const { ESidai, owner, user1 } = await loadFixture(deploy)
            const price = ethers.utils.parseEther('0.25')
            expect(await ESidai.setPublicPrice(price)).to.emit()
            expect(await ESidai.PUBLIC_MINT_PRICE()).to.be.eqls(ethers.utils.parseEther('0.25'))

            //Revert if not owner
            await expect(ESidai.connect(user1).setPublicPrice(price)).to.be.
                revertedWith("Ownable: caller is not the owner")
        })

        it('setMinting', async function () {
            const { ESidai, user1 } = await loadFixture(deploy)
            await ESidai.setMinting(true)
            expect(await ESidai.minting()).to.be.eqls(true)

            //Revert if not owner
            await expect(ESidai.connect(user1).setMinting(true)).to.be.
                revertedWith("Ownable: caller is not the owner")
        })

        it('setDefaultRoyalty', async function () {
            const { ESidai, user1 } = await loadFixture(deploy)
            await ESidai.setDefaultRoyalty(user1.getAddress(), 500)
            const { 0: reciever, 1: amount } = await ESidai.royaltyInfo(1, ethers.utils.parseEther('100'))
            expect(amount).to.equal(ethers.utils.parseEther('5'))
            expect(reciever).to.be.eq(await user1.getAddress())

            //Revert if not owner
            await expect(ESidai.connect(user1).setDefaultRoyalty(user1.getAddress(), 500)).to.be.
                revertedWith("Ownable: caller is not the owner")

        })

    })

    describe('Mint Oparations', function () {


        describe('Public Mint', function () {

            it('Revert if Insufficent Funds', async function () {
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

            it('Revert if Max per wallet reached', async function () {
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

            it('Revert if Max supply reached', async function () {
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

            it('Revert if Minting closed', async function () {
                const { ESidai, user1, user2, user3 } = await loadFixture(deploy)
                await ESidai.setPublicPrice(ethers.utils.parseEther('0.1'))

                try {
                    await ESidai.connect(user3).publicMint(2, { value: ethers.utils.parseEther('0.2') })
                    // If the transaction did not revert, fail the test
                    expect.fail('Transaction did not revert');
                } catch (error) {
                    // Check if the error message matches the expected custom error message
                    expect(error.message).to.include('Unauthorized()');
                }
            })

            it('Mint if very thing is okay', async function () {
                const { ESidai, user1, user2 } = await loadFixture(deploy)
                await ESidai.setMinting('true')
                await ESidai.setPublicPrice(ethers.utils.parseEther('0.1'))
                await ESidai.connect(user1).publicMint(2, { value: ethers.utils.parseEther('0.2') })
                expect(await ESidai.totalSupply()).to.equal(2)
                expect(await ethers.provider.getBalance(ESidai.address)).to.be.equal(ethers.utils.parseEther('0.2'))

            })
        })

        describe('Owner mint', function () {

            it('Revert if amount exceeding MAX_Supply', async function () {
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

            it('Revert if caller not owner', async function () {
                const { ESidai, owner, user1, user3 } = await loadFixture(deploy)
                const ownerAddress = await owner.getAddress()
                try {
                    await ESidai.connect(user1).ownerMint(ownerAddress, 6)
                    // If the transaction did not revert, fail the test
                    expect.fail('Transaction did not revert');
                } catch (error) {
                    expect(error.message).to.include("Ownable: caller is not the owner")

                }
            })

            it('should mint is every thing okay', async function () {
                const { ESidai, owner } = await loadFixture(deploy)
                await ESidai.setMinting('true')
                const ownerAddress = await owner.getAddress()
                await ESidai.ownerMint(ownerAddress, 5)
                expect(await ESidai.balanceOf(ownerAddress)).to.be.equal(5)

            })

        })

    })

    describe('Withdraw oparation', function () {

        it('Revert if  not owner', async function () {
            const { ESidai, user1, user2, user3 } = await loadFixture(deploy)
            await ESidai.setMinting(true)

            //mint to have ETH

            //mint public 
            await ESidai.connect(user1).publicMint(1, { value: ethers.utils.parseEther('0.1') })
            await ESidai.connect(user2).publicMint(2, { value: ethers.utils.parseEther('0.3') })


            try {
                await ESidai.connect(user3).withdraw()
                // If the transaction did not revert, fail the test
                expect.fail('Transaction did not revert');
            } catch (error) {
                // Check if the error message matches the expected custom error message
                expect(error.message).to.include("Ownable: caller is not the owner");
            }
  

        })
        it('Should withdraw funds', async function () {

            const { ESidai, owner, user1, user2 } = await loadFixture(deploy)
            console.log(`           Funds before mint: ${ethers.utils.formatEther(
                await ethers.provider.getBalance(ESidai.address))}`)
            await ESidai.setMinting(true)

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

    describe('Getters oparations', function () {

        it('getNumberMinted', async function () {
            const { ESidai, user1 } = await loadFixture(deploy)

            try {
                await ESidai.setMinting(true)
                await ESidai.connect(user1).publicMint(2, { value: ethers.utils.parseEther('0.04') })
                expect(await ESidai.getNumberMinted(user1.address)).to.be.eq(2)
            } catch (error) {
                console.error(error.message)
            }

        })


    })

})