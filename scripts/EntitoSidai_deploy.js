const { ethers } = require("hardhat");


async function main() {

    const accounts = await ethers.getSigners();
    
    //get contract factory
    this.ESidai =await ethers.getContractFactory('EntitoSidai')
    //deploy
    this.ESidai = await this.ESidai.connect(accounts[1]).deploy()

    console.log( `Contract deployed at ${this.ESidai.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
