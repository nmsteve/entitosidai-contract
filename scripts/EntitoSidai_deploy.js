const { ethers } = require("hardhat");


async function main() {

    const accounts = await ethers.getSigners();
    
    //get contract factory
    this.ESidai = await ethers.getContractFactory("EntitoSidaiNFTs")
    //deploy
    this.ESidai = await this.ESidai.connect(accounts[0]).deploy('https://ipfs.io/ipfs/bafkreihagbkccprqcu5t6pdx7bddkjedxtw6rkid6taoa2y3qdv4pjxola')

    console.log( `Contract deployed at ${this.ESidai.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

