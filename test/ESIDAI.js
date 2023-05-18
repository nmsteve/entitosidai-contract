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
        const [owner, user1, user2, user3, user4] = await ethers.getSigners();

        this.ESidai = await ethers.getContractFactory("EntitoSidai");
        const ESidai = await this.ESidai.deploy();

        return { ESidai, owner, user1, user2, user3, user4 };
    }

    describe('Deployment', function () {
        it('should set owner to msg.sender', async function () {
            const { ESidai, owner } = await loadFixture(deploy)
            expect(await ESidai.owner()).to.be.equal(await owner.getAddress())
        })

    })

    describe('Join waitlist', function () {
        it('should allow any one to join', async function () {
            const { ESidai, owner, user1, user2, user3, user4 } = await loadFixture(deploy)
            await ESidai.connect(user1).joinWaitlist()
            await ESidai.connect(user2).joinWaitlist()
            expect(await ESidai.seatsFilled()).to.be.equal(2)
            expect(await ESidai.waitlisted(await user1.getAddress())).to.be.equal(true)

        })

        it('Should revert if Already in waitList', async function () {
            const { ESidai, owner, user1, user2, user3, user4 } = await loadFixture(deploy)
            await ESidai.connect(user1).joinWaitlist()
            await expect(ESidai.connect(user1).joinWaitlist()).to.be.rejectedWith("Already on the waitlist")

        })

        it('Should revert if "Waitlist is full"', async function () {
            const { ESidai, owner, user1, user2, user3, user4 } = await loadFixture(deploy)
            await ESidai.connect(user1).joinWaitlist()
            await ESidai.connect(user2).joinWaitlist()
            await ESidai.connect(user3).joinWaitlist()
            expect(await ESidai.seatsFilled()).to.be.equal(3)
            await expect(ESidai.connect(user4).joinWaitlist()).to.be.rejectedWith("Waitlist is full")

        })
    })

    describe('Mint Oparations', function () {


        describe('WaitList Mint', function () {

            it('revert if address not in waitlist', async function () {
                const { ESidai, owner, user1 } = await loadFixture(deploy)
                await ESidai.setPhase(1)
                await expect(ESidai.waitlistMint(2, { value: ethers.utils.parseEther('0.075') })).to.be.revertedWith("Not on the waitlist")
            })

            it('Should Revert if Insufficent Funds', async function () {
                const { ESidai, user1 } = await loadFixture(deploy)
                await ESidai.setPhase(1)
                await ESidai.connect(user1).joinWaitlist()
                try {
                    await ESidai.connect(user1).waitlistMint(2, { value: ethers.utils.parseEther('0.1') })
                    // If the transaction did not revert, fail the test
                    expect.fail('Transaction did not revert');
                } catch (error) {
                    // Check if the error message matches the expected custom error message
                    expect(error.message).to.include('IncorrectETHSent()');
                }
            })

            it('Should mint if everything is okay', async function () {
                const { ESidai, user1 } = await loadFixture(deploy)
                await ESidai.setPhase(1)
                await ESidai.connect(user1).joinWaitlist()
                await ESidai.connect(user1).waitlistMint(2, {
                    value: ethers.utils.parseEther('0.15')

                })
                expect(await ethers.provider.getBalance(ESidai.address)).to.be.equal(ethers.utils.parseEther('0.15'))
                expect(await ESidai.getNumberMinted(await user1.getAddress())).to.be.equal(2)

            })

            it('Should Revert if Max per wallet reached', async function () {
                const { ESidai, user1 } = await loadFixture(deploy)
                await ESidai.setPhase(1)
                await ESidai.connect(user1).joinWaitlist()
                await ESidai.connect(user1).waitlistMint(1, { value: ethers.utils.parseEther('0.1') })

                try {
                    await ESidai.connect(user1).waitlistMint(2, { value: ethers.utils.parseEther('0.2') })
                    // If the transaction did not revert, fail the test
                    expect.fail('Transaction did not revert');
                } catch (error) {
                    // Check if the error message matches the expected custom error message
                    expect(error.message).to.include('ExceedsMaxPerWallet()');
                }
            })

            it('Should Revert if Max supply reached', async function () {
                const { ESidai, user1, user2, user3 } = await loadFixture(deploy)
                await ESidai.setPhase(1)
                await ESidai.connect(user1).joinWaitlist()
                await ESidai.connect(user2).joinWaitlist()
                await ESidai.connect(user3).joinWaitlist()
                await ESidai.connect(user1).waitlistMint(2, { value: ethers.utils.parseEther('0.2') })
                await ESidai.connect(user2).waitlistMint(2, { value: ethers.utils.parseEther('0.2') })


                try {
                    await ESidai.connect(user3).waitlistMint(2, { value: ethers.utils.parseEther('0.2') })
                    // If the transaction did not revert, fail the test
                    expect.fail('Transaction did not revert');
                } catch (error) {
                    // Check if the error message matches the expected custom error message
                    expect(error.message).to.include('ExceedsMaxSupply()');
                }
            })

            it('Similar reverts tested in Public Mint')
        })

        describe('Public Mint', function () {

            it('should revert if Phase is: CLOSE', async function () {
                const { ESidai, user1 } = await loadFixture(deploy)
                expect(await ESidai.phase()).to.be.equal(0)
                try {
                    await ESidai.connect(user1).publicMint(2)
                    // If the transaction did not revert, fail the test
                    expect.fail('Transaction did not revert');
                } catch (error) {
                    // Check if the error message matches the expected custom error message
                    expect(error.message).to.include('MintIsNotOpen()');
                }
            })

            it('should revert if Phase is: WAITLIST', async function () {
                const { ESidai, user1 } = await loadFixture(deploy)
                await ESidai.setPhase(1)
                expect(await ESidai.phase()).to.be.equal(1)

                try {
                    await ESidai.connect(user1).publicMint(2)
                    // If the transaction did not revert, fail the test
                    expect.fail('Transaction did not revert');
                } catch (error) {
                    // Check if the error message matches the expected custom error message
                    expect(error.message).to.include('MintIsNotOpen()');
                }
            })

            it('should revert if Phase is: COMPLETE', async function () {
                const { ESidai, user1 } = await loadFixture(deploy)
                await ESidai.setPhase(3)
                expect(await ESidai.phase()).to.be.equal(3)

                try {
                    await ESidai.connect(user1).publicMint(2)
                    // If the transaction did not revert, fail the test
                    expect.fail('Transaction did not revert');
                } catch (error) {
                    // Check if the error message matches the expected custom error message
                    expect(error.message).to.include('MintIsNotOpen()');
                }
            })

            it('Should Revert if Insufficent Funds', async function () {
                const { ESidai, user1 } = await loadFixture(deploy)
                await ESidai.setPhase(2)
                await ESidai.setPublicPrice(ethers.utils.parseEther('0.1'))
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
                await ESidai.setPhase(2)
                await ESidai.setPublicPrice(ethers.utils.parseEther('0.1'))
                await ESidai.connect(user1).publicMint(2, { value: ethers.utils.parseEther('0.2') })
                expect(await ESidai.totalSupply()).to.equal(2)
                expect(await ethers.provider.getBalance(ESidai.address)).to.be.equal(ethers.utils.parseEther('0.2'))

            })

            it('Should mint if higher amount is passed', async function () {
                const { ESidai, user1, user2 } = await loadFixture(deploy)
                await ESidai.setPhase(2)
                await ESidai.setPublicPrice(ethers.utils.parseEther('0.1'))
                await ESidai.connect(user1).publicMint(2, { value: ethers.utils.parseEther('0.3') })
                expect(await ESidai.totalSupply()).to.equal(2)
                expect(await ethers.provider.getBalance(ESidai.address)).to.be.equal(ethers.utils.parseEther('0.3'))

            })

            it('Should Revert if Max per wallet reached', async function () {
                const { ESidai, user1 } = await loadFixture(deploy)
                await ESidai.setPhase(2)
                await ESidai.setPublicPrice(ethers.utils.parseEther('0.1'))
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
                await ESidai.setPhase(2)
                await ESidai.setPublicPrice(ethers.utils.parseEther('0.1'))
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

        describe('double mint', function () {
            it('should mint waitlist then public if max_per_wallet not reached', async function () {
                const { ESidai, user1 } = await loadFixture(deploy)
                //mint waitlist
                await ESidai.setPhase(1)
                await ESidai.connect(user1).joinWaitlist()
                await ESidai.connect(user1).waitlistMint(1, { value: ethers.utils.parseEther('0.075') })
                expect(await ethers.provider.getBalance(ESidai.address)).to.be.eq(ethers.utils.parseEther('0.075'))

                //mint public 
                await ESidai.setPhase(2)
                await ESidai.connect(user1).publicMint(1, { value: ethers.utils.parseEther('0.1') })
                expect(await ethers.provider.getBalance(ESidai.address)).to.be.eq(ethers.utils.parseEther('0.175'))

            })

            it('should not mint waitlist then public if max_per_wallet reached', async function () {
                const { ESidai, user1 } = await loadFixture(deploy)
                //mint waitlist
                await ESidai.setPhase(1)
                await ESidai.connect(user1).joinWaitlist()
                await ESidai.connect(user1).waitlistMint(2, { value: ethers.utils.parseEther('0.15') })
                expect(await ethers.provider.getBalance(ESidai.address)).to.be.eq(ethers.utils.parseEther('0.15'))

                //mint public 
                await ESidai.setPhase(2)
                try {
                    await ESidai.connect(user1).publicMint(2, { value: ethers.utils.parseEther('0.2') })
                    // If the transaction did not revert, fail the test
                    expect.fail('Transaction did not revert');
                } catch (error) {
                    // Check if the error message matches the expected custom error message
                    expect(error.message).to.include('ExceedsMaxPerWallet()');
                }


            })
        })

    })

    describe('Funds Oparations', function () {
        it('Should withdraw funds at any time', async function () {

            const { ESidai, owner, user1, user2 } = await loadFixture(deploy)
            //const collectedFunds =
            console.log(`           Funds before mint: ${ethers.utils.formatEther(
                await ethers.provider.getBalance(ESidai.address))}`)

            //mint to have ETH
            //mint waitlist
            await ESidai.setPhase(1)
            await ESidai.connect(user1).joinWaitlist()
            await ESidai.connect(user1).waitlistMint(2, { value: ethers.utils.parseEther('0.15') })
            expect(await ethers.provider.getBalance(ESidai.address)).to.be.eq(ethers.utils.parseEther('0.15'))

            //mint public 
            await ESidai.setPhase(2)
            await ESidai.connect(user2).publicMint(1, { value: ethers.utils.parseEther('0.1') })
            expect(await ethers.provider.getBalance(ESidai.address)).to.be.eq(ethers.utils.parseEther('0.25'))
            console.log(`           Funds after mint: ${ethers.utils.formatEther(
                await ethers.provider.getBalance(ESidai.address))}`)

            //withdraw
            const balBefore = await ethers.provider.getBalance(await owner.getAddress())
            await ESidai.withdraw()
            const balAfter = await ethers.provider.getBalance(await owner.getAddress())
            console.log(`           Amount expected: 0.25`)
            console.log(`           Amount collected: ${ethers.utils.formatEther((balAfter - balBefore).toString())}`)

        })

        it('Should have the royalty fees set to 2.5%', async function () {
            const { ESidai, owner } = await loadFixture(deploy)
            const { 0:reciever, 1:amount } = await ESidai.royaltyInfo(1, ethers.utils.parseEther('100'))
            expect(amount).to.equal(ethers.utils.parseEther('2.5'))
            expect(reciever).to.be.eq(await owner.getAddress())

        })

    })

})