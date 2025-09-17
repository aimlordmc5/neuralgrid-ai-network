"use client";

import { BrowserProvider, Contract, formatUnits, parseEther } from "ethers";
import { toast } from "sonner";

export const U2U_CHAIN_ID_HEX = "0x27"; // 39

const CORE_ADDRESS = process.env.NEXT_PUBLIC_CORE_ADDRESS as string | undefined;
const TOKEN_ADDRESS = process.env.NEXT_PUBLIC_TOKEN_ADDRESS as string | undefined;
const U2U_RPC = process.env.NEXT_PUBLIC_U2U_RPC || "https://rpc-nebulas-testnet.uniultra.xyz";

// Minimal ABIs
const CORE_ABI = [
  {
    inputs: [],
    name: "getTotalStats",
    outputs: [
      { internalType: "uint256", name: "totalNodes", type: "uint256" },
      { internalType: "uint256", name: "totalJobs", type: "uint256" },
      { internalType: "uint256", name: "activeJobs", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  // add minimal createJob (payable) and JobCreated event for on-chain job creation
  {
    inputs: [
      { internalType: "string", name: "description", type: "string" },
      { internalType: "uint256", name: "requiredNodes", type: "uint256" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "createJob",
    outputs: [{ internalType: "uint256", name: "jobId", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "jobId", type: "uint256" },
      { indexed: true, internalType: "address", name: "requester", type: "address" },
      { indexed: false, internalType: "uint256", name: "reward", type: "uint256" },
    ],
    name: "JobCreated",
    type: "event",
  },
];

const ERC20_ABI = [
  { inputs: [], name: "decimals", outputs: [{ type: "uint8" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "account", type: "address" }], name: "balanceOf", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
];

export async function getProvider() {
  if (typeof window === "undefined") throw new Error("No window");
  const { ethereum } = window as any;
  if (!ethereum) throw new Error("MetaMask not found");
  return new BrowserProvider(ethereum);
}

export async function getSigner() {
  const provider = await getProvider();
  await provider.send("eth_requestAccounts", []);
  return await provider.getSigner();
}

// New: get current connected account address
export async function getAccount() {
  const signer = await getSigner();
  return await signer.getAddress();
}

export async function ensureU2UNetwork() {
  const { ethereum } = window as any;
  if (!ethereum) throw new Error("MetaMask not found");
  try {
    await ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: U2U_CHAIN_ID_HEX }] });
  } catch (switchError: any) {
    if (switchError?.code === 4902) {
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: U2U_CHAIN_ID_HEX,
            chainName: "U2U Nebulas Testnet",
            rpcUrls: [U2U_RPC],
            nativeCurrency: { name: "U2U", symbol: "U2U", decimals: 18 },
            blockExplorerUrls: ["https://testnet.u2uscan.xyz"],
          },
        ],
      });
    } else {
      throw switchError;
    }
  }
}

export async function readCoreTotalStats() {
  if (!CORE_ADDRESS) throw new Error("NEXT_PUBLIC_CORE_ADDRESS is not set");
  await ensureU2UNetwork();
  const provider = await getProvider();
  const core = new Contract(CORE_ADDRESS, CORE_ABI, provider);
  const [totalNodes, totalJobs, activeJobs] = await core.getTotalStats();
  return {
    totalNodes: Number(totalNodes),
    totalJobs: Number(totalJobs),
    activeJobs: Number(activeJobs),
  };
}

export async function getTokenBalance(address: string) {
  if (!TOKEN_ADDRESS) throw new Error("NEXT_PUBLIC_TOKEN_ADDRESS is not set");
  await ensureU2UNetwork();
  const provider = await getProvider();
  const token = new Contract(TOKEN_ADDRESS, ERC20_ABI, provider);
  const [dec, bal] = await Promise.all([token.decimals(), token.balanceOf(address)]);
  return Number(formatUnits(bal, dec));
}

// --- On-chain Job Creation ---
function parseRelativeDeadline(deadline: string): number {
  if (deadline.includes("T") || deadline.includes("-")) {
    return Math.floor(new Date(deadline).getTime() / 1000);
  }
  const match = deadline.match(/in\s+(\d+)\s*([mhd])/i);
  if (!match) throw new Error("Invalid deadline format");
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const nowSec = Math.floor(Date.now() / 1000);
  if (unit === "m") return nowSec + value * 60;
  if (unit === "h") return nowSec + value * 60 * 60;
  if (unit === "d") return nowSec + value * 24 * 60 * 60;
  throw new Error("Invalid time unit");
}

export async function createOnchainJob(params: {
  description: string;
  requiredNodes: number;
  deadline: string; // relative or ISO
  rewardNgrOrU2U: number; // interpreted as native value for now
}): Promise<{ txHash: string; jobId?: number }> {
  if (!CORE_ADDRESS) throw new Error("NEXT_PUBLIC_CORE_ADDRESS is not set");
  await ensureU2UNetwork();
  const signer = await getSigner();
  const core = new Contract(CORE_ADDRESS, CORE_ABI, signer);

  const deadlineTs = parseRelativeDeadline(params.deadline);
  const value = params.rewardNgrOrU2U > 0 ? parseEther(String(params.rewardNgrOrU2U)) : 0n;

  const tx = await core.createJob(params.description, params.requiredNodes, deadlineTs, { value });
  const receipt = await tx.wait();

  // Try to extract jobId from either return value or JobCreated event
  let jobId: number | undefined;
  try {
    // ethers v6: receipt.logs + core.interface.parseLog
    for (const log of receipt.logs || []) {
      try {
        const parsed = core.interface.parseLog(log);
        if (parsed?.name === "JobCreated") {
          const id = parsed.args?.[0];
          if (id) {
            jobId = Number(id);
            break;
          }
        }
      } catch {}
    }
  } catch {}

  return { txHash: tx.hash, jobId };
}