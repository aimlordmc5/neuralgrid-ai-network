import { NextRequest, NextResponse } from 'next/server';
import { ethers, JsonRpcProvider, Contract } from 'ethers';
import { db } from '@/db';
import { jobs, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Minimal ABI for JobCreated event
const JOB_CREATED_ABI = [
  'event JobCreated(uint256 indexed jobId, address indexed requester, uint256 reward)'
];

export async function POST(request: NextRequest) {
  try {
    // Validate required environment variables
    const rpcUrl = process.env.NEXT_PUBLIC_U2U_RPC;
    const contractAddress = process.env.NEXT_PUBLIC_CORE_ADDRESS;
    
    // Allow missing contract address but return 0 synced
    if (!contractAddress || !rpcUrl) {
      return NextResponse.json({
        synced: 0,
        fromBlock: 0,
        toBlock: 0,
        lastBlock: 0
      });
    }

    // Parse request body for block range
    const body = await request.json().catch(() => ({}));
    const { fromBlock: requestedFrom, toBlock: requestedTo } = body;
    
    // Initialize blockchain provider
    const provider = new JsonRpcProvider(rpcUrl);
    
    // Determine block range
    let fromBlock: number;
    let toBlock: number;
    
    if (requestedFrom !== undefined && requestedTo !== undefined) {
      fromBlock = Math.max(0, requestedFrom);
      toBlock = requestedTo;
    } else {
      // Default to last 5000 blocks
      const currentBlock = await provider.getBlockNumber();
      fromBlock = Math.max(0, currentBlock - 4999);
      toBlock = currentBlock;
    }

    // Create contract instance
    const contract = new Contract(contractAddress, JOB_CREATED_ABI, provider);

    // Fetch JobCreated events
    const events = await contract.queryFilter('JobCreated', fromBlock, toBlock);
    
    let synced = 0;
    
    // Process each event
    for (const event of events) {
      try {
        const { jobId, requester, reward } = event.args;
        const onchainId = Number(jobId.toString());
        const requesterAddress = requester.toLowerCase();
        const rewardAmount = Math.floor(Number(ethers.formatEther(reward)));
        const transactionHash = event.transactionHash;
        
        // Find or create user for requester address
        let user = await db.select()
          .from(users)
          .where(eq(users.address, requesterAddress))
          .limit(1);
        
        let userId: number;
        if (user.length === 0) {
          const newUser = await db.insert(users).values({
            address: requesterAddress,
            username: null,
            createdAt: Date.now()
          }).returning();
          userId = newUser[0].id;
        } else {
          userId = user[0].id;
        }
        
        // Check if job already exists by onchainId
        const existingJob = await db.select()
          .from(jobs)
          .where(eq(jobs.onchainId, onchainId))
          .limit(1);
        
        if (existingJob.length > 0) {
          // Update existing job, preserve title/description if present
          const job = existingJob[0];
          await db.update(jobs)
            .set({
              reward: job.reward || rewardAmount,
              status: job.status || 'PENDING',
              onchainTx: transactionHash,
              requesterUserId: job.requesterUserId || userId
            })
            .where(eq(jobs.onchainId, onchainId));
        } else {
          // Create new job from blockchain event
          await db.insert(jobs).values({
            title: `Job #${onchainId}`,
            description: null,
            reward: rewardAmount,
            status: 'PENDING',
            requiredNodes: 1, // Default value
            deadline: Date.now() + (24 * 60 * 60 * 1000), // Default 24h deadline
            requesterUserId: userId,
            onchainId: onchainId,
            onchainTx: transactionHash,
            createdAt: Date.now()
          });
        }
        
        synced++;
      } catch (eventError) {
        console.error('Error processing event:', eventError);
        // Continue processing other events
      }
    }
    
    const lastBlock = await provider.getBlockNumber();
    
    return NextResponse.json({
      synced,
      fromBlock,
      toBlock,
      lastBlock
    });
    
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}