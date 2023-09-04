const { ethers } = require("hardhat");
require('dotenv').config



async function getGasPrice(network) {

    const connectionInfo = {
        url: network,
        timeout: 3000000
    }; 

    const provider = new ethers.providers.JsonRpcProvider(connectionInfo); 


    const response = await provider.send('eth_gasPrice', []);
    const priceInWei = ethers.BigNumber.from(response);
    const priceInEth = priceInWei/10 ** 9
    return priceInEth
}

async function deployContract() {

    try {
        //get signer
        const [user1, user2] = await ethers.getSigners()
        //get contract factory
        this.ESidai = await ethers.getContractFactory("EntitoSidaiNFTs")

        //deploy
        this.ESidai = await this.ESidai.connect(user1).deploy()

        console.log(`Contract deployed at ${this.ESidai.address}`);
    } catch (error) {
        console.error('Error deploying contract:', error);
    }
}

async function main() {

    const PRICE = await getGasPrice(process.env.ARBITRUM)
    console.log(PRICE.toFixed(4))

    deployContract()
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

