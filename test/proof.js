const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe('ESidai', function (params) {

    // We define a fixture to reuse the same setup in every test.
    // We use loadFixture to run this setup once, snapshot that state,
    // and reset Hardhat Network to that snapshot in every test.
    async function deploy() {


        // Contracts are deployed using the first signer/account by default
        const [owner, user1, user2, user3, user4, user5] = await ethers.getSigners();

        this.ESidai = await ethers.getContractFactory("EntitoSidaiWaitlistProof");
        const ESidai = await this.ESidai.deploy();

        return { ESidai, owner, user1, user2, user3, user4, user5 };
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
            await ESidai.connect(user3).joinWaitlist()
            await ESidai.connect(user4).joinWaitlist()
            expect(await ESidai.seatsFilled()).to.be.equal(4)
            expect(await ESidai.waitlisted(await user1.getAddress())).to.be.equal(true)

        })

        it('Should revert if Already in waitList', async function () {
            const { ESidai, owner, user1, user2, user3, user4 } = await loadFixture(deploy)
            await ESidai.connect(user1).joinWaitlist()
            await expect(ESidai.connect(user1).joinWaitlist()).to.be.rejectedWith("Already on the waitlist")

        })

        it('Should revert if "Waitlist is full"', async function () {
            const { ESidai, owner, user1, user2, user3, user4, user5 } = await loadFixture(deploy)
            await ESidai.connect(user1).joinWaitlist()
            await ESidai.connect(user2).joinWaitlist()
            await ESidai.connect(user3).joinWaitlist()
            await ESidai.connect(user4).joinWaitlist()
            expect(await ESidai.seatsFilled()).to.be.equal(4)
            await expect(ESidai.connect(user5).joinWaitlist()).to.be.rejectedWith("Waitlist is full")

        })
    })

    describe('Set MAX Seats', function () {
        it('Should set to right value', async function () {
            const { owner, user1, ESidai } = await loadFixture(deploy)
            await ESidai.setMaxSeats(300)
            expect(await ESidai.MAX_SEATS()).to.be.eq(300)
            
        })

        it('Should allow only owner to set it', async function () {
            const { owner, ESidai, user1 } = await loadFixture(deploy)
            await expect(ESidai.connect(user1).setMaxSeats(300)).to.be.rejectedWith("Caller is not the owner")
        })
        
    })

})