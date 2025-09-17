const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", await deployer.getAddress());

  // Deploy NGR Token with 1,000,000,000 supply (18 decimals)
  const Token = await hre.ethers.getContractFactory("NeuralGridToken");
  const initialSupply = hre.ethers.parseUnits("1000000000", 18);
  const token = await Token.deploy(initialSupply);
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("NeuralGridToken deployed at:", tokenAddress);

  // Deploy Core
  const Core = await hre.ethers.getContractFactory("NeuralGridCore");
  const core = await Core.deploy();
  await core.waitForDeployment();
  const coreAddress = await core.getAddress();
  console.log("NeuralGridCore deployed at:", coreAddress);

  // Seed a couple of demo jobs (payable) for the UI demo
  try {
    const now = Math.floor(Date.now() / 1000);
    const tx1 = await core.createJob(
      "Image Classification Batch",
      3,
      now + 60 * 60, // 1h
      { value: hre.ethers.parseEther("0.15") }
    );
    await tx1.wait();

    const tx2 = await core.createJob(
      "Sentiment Analysis",
      2,
      now + 30 * 60, // 30m
      { value: hre.ethers.parseEther("0.08") }
    );
    await tx2.wait();

    console.log("Seeded demo jobs.");
  } catch (e) {
    console.warn("Seeding jobs failed (non-fatal):", e?.message || e);
  }

  console.log("\nSet these in your .env or .env.local for the web app:");
  console.log("NEXT_PUBLIC_TOKEN_ADDRESS=", tokenAddress);
  console.log("NEXT_PUBLIC_CORE_ADDRESS=", coreAddress);

  // Write or update .env.local with public addresses for the frontend
  try {
    const envPath = path.resolve(process.cwd(), ".env.local");
    let current = "";
    if (fs.existsSync(envPath)) {
      current = fs.readFileSync(envPath, "utf8");
    }

    const setOrReplace = (content, key, value) => {
      const line = `${key}=${value}`;
      const regex = new RegExp(`^${key}=.*$`, "m");
      return regex.test(content)
        ? content.replace(regex, line)
        : (content.endsWith("\n") || content.length === 0)
          ? content + line + "\n"
          : content + "\n" + line + "\n";
    };

    let next = current;
    next = setOrReplace(next, "NEXT_PUBLIC_TOKEN_ADDRESS", tokenAddress);
    next = setOrReplace(next, "NEXT_PUBLIC_CORE_ADDRESS", coreAddress);
    // Helpful defaults for the app
    next = setOrReplace(next, "NEXT_PUBLIC_CHAIN_ID", "39");
    next = setOrReplace(next, "NEXT_PUBLIC_U2U_RPC", "https://rpc-nebulas-testnet.uniultra.xyz");

    fs.writeFileSync(envPath, next, "utf8");
    console.log(`\nUpdated ${envPath} with deployed addresses and chain config.`);
  } catch (e) {
    console.warn("Failed to write .env.local:", e?.message || e);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});