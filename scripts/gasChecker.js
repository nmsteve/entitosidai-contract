const fs = require('fs');
const { ethers } = require("ethers");

const TARGET_GAS_PRICES_GWEI = [30, 25,24,23,21,20,19, 18, 17, 16,15, 14,13, 12, 9, 10, 8, 6, 4, 2];
const CHECK_INTERVAL_MS = 5000; // Set the interval to check for gas prices in milliseconds (5 seconds in this example)
let gasPriceSaved = {}; // Object to track if gas price is already saved for each target value

const connectionInfo = {
    url: 'https://eth-mainnet.g.alchemy.com/v2/dkwmGZoJ10LGlhlcoOLweDBb19HnAi0b',
    timeout: 3000000
};

const provider = new ethers.providers.JsonRpcProvider(connectionInfo);

async function getGasPrice() {
    const response = await provider.send('eth_gasPrice', []);
    return ethers.BigNumber.from(response);
}

async function waitForCheapGas() {
    console.log('Waiting for gas price to go below', TARGET_GAS_PRICES_GWEI.join(', '), 'Gwei...');
    while (true) {
        const gasPriceWei = await getGasPrice();
        const gasPriceGwei = ethers.utils.formatUnits(gasPriceWei, 'gwei');

        for (const targetGasPrice of TARGET_GAS_PRICES_GWEI) {
            if (gasPriceGwei <= targetGasPrice && !gasPriceSaved[targetGasPrice]) {
                console.log('Gas price is', gasPriceGwei, 'Gwei. Saving to file...');
                const timestamp = new Date().toLocaleTimeString();
                fs.appendFileSync('gasPrice.txt', `Gas price is ${gasPriceGwei} Gwei at ${timestamp}\n`);
                gasPriceSaved[targetGasPrice] = true; // Mark the gas price as saved for this target value
            }
        }

        console.log('Current gas price is', gasPriceGwei, 'Gwei. Checking again in', CHECK_INTERVAL_MS / 1000, 'seconds...');
        await new Promise((resolve) => setTimeout(resolve, CHECK_INTERVAL_MS));
    }
}

async function main() {
    try {
        await waitForCheapGas();
    } catch (error) {
        console.error(error);
        process.exitCode = 1;
    }
}

main();
