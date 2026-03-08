import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import keyPairJson from "../keypair.json" with { type: "json" };

const keypair = Ed25519Keypair.fromSecretKey(keyPairJson.privateKey);
const address = keypair.getPublicKey().toSuiAddress();
const suiClient = new SuiGrpcClient({
    network: 'testnet',
    baseUrl: 'https://fullnode.testnet.sui.io:443',
});

// The Deployed Contract Address
const PACKAGE_ID = '0xd56e5075ba297f9e37085a37bb0abba69fabdf9987f8f4a6086a3693d88efbfd';
const CLOCK_ID = '0x6';

(async () => {
    console.log("SUI CTF Sniper Running...");
    console.log("Your Address:", address);
    console.log("Waiting for the 5-minute windows...");

    while (true) {
        const nowMs = Date.now();
        const secondsIntoHour = Math.floor(nowMs / 1000) % 3600;

        const inWindow1 = secondsIntoHour >= 0 && secondsIntoHour < 300;
        const inWindow2 = secondsIntoHour >= 1800 && secondsIntoHour < 2100;

        if (inWindow1 || inWindow2) {
            console.log(`\nWINDOW OPEN! (${secondsIntoHour}s). Extracting flag...`);
            
            try {
                const tx = new Transaction();
                
                // 1. Call the function and CAPTURE the result
                const [flag] = tx.moveCall({
                    target: `${PACKAGE_ID}::moving_window::extract_flag`,
                    arguments: [tx.object(CLOCK_ID)],
                });

                // 2. IMPORTANT: Transfer the Flag to yourself!
                // This fixes the "UnusedValueWithoutDrop" error.
                tx.transferObjects([flag], tx.pure.address(address));

                const result = await suiClient.signAndExecuteTransaction({
                    signer: keypair,
                    transaction: tx,
                    options: {
                        showEffects: true,
                    },
                });

                if (result.effects?.status.status === 'success') {
                    console.log("✅ SUCCESS! Flag extracted and transferred to you.");
                    console.log("Digest:", result.digest);
                    process.exit(0); 
                } else {
                    console.log("❌ Failed:", result.effects?.status.error);
                }
            } catch (e) {
                console.error("RPC Error:", e);
            }
        } else {
            let waitSeconds = 0;
            if (secondsIntoHour < 1800) {
                waitSeconds = 1800 - secondsIntoHour;
            } else {
                waitSeconds = 3600 - secondsIntoHour;
            }

            process.stdout.write(`\rCurrent: ${secondsIntoHour}s. Window closed. Waiting ~${waitSeconds}s... `);
            const sleepTime = waitSeconds > 10 ? 10000 : 1000;
            await new Promise(r => setTimeout(r, sleepTime));
        }
    }
})();
