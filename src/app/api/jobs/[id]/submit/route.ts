import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, jobs, earnings } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = parseInt(params.id);

    if (!params.id || isNaN(jobId)) {
      return NextResponse.json(
        { error: "Valid job ID is required", code: "INVALID_JOB_ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { workerAddress } = body;

    if (!workerAddress || typeof workerAddress !== 'string') {
      return NextResponse.json(
        { error: "Worker address is required", code: "MISSING_WORKER_ADDRESS" },
        { status: 400 }
      );
    }

    // Get the job
    const jobResults = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);

    if (jobResults.length === 0) {
      return NextResponse.json(
        { error: "Job not found", code: "JOB_NOT_FOUND" },
        { status: 404 }
      );
    }

    const job = jobResults[0];

    // Validate job status
    if (!['PENDING', 'ACTIVE'].includes(job.status)) {
      return NextResponse.json(
        { error: "Job is not available for submission", code: "JOB_NOT_SUBMITTABLE" },
        { status: 400 }
      );
    }

    // Validate deadline (job.deadline is stored as unix timestamp)
    const currentTime = Date.now();
    if (currentTime > job.deadline) {
      return NextResponse.json(
        { error: "Job deadline has passed", code: "DEADLINE_PASSED" },
        { status: 400 }
      );
    }

    // Normalize worker address
    const normalizedAddress = workerAddress.toLowerCase();

    // Find or create user
    let userResults = await db.select().from(users).where(eq(users.address, normalizedAddress)).limit(1);
    
    let userId: number;
    if (userResults.length === 0) {
      const insertResult = await db.insert(users).values({
        address: normalizedAddress,
        username: null,
        createdAt: Date.now()
      }).returning();
      userId = insertResult[0].id;
    } else {
      userId = userResults[0].id;
    }

    // Calculate payout amount
    let payout = job.reward;
    if (job.requiredNodes != null && job.requiredNodes > 0) {
      payout = Math.floor(job.reward / job.requiredNodes);
    }

    // Create earnings record
    const earningsResult = await db.insert(earnings).values({
      userId: userId,
      jobId: job.id,
      amount: payout,
      createdAt: Date.now()
    }).returning();

    // Update job to completed status
    await db.update(jobs).set({ status: "COMPLETED" }).where(eq(jobs.id, jobId));

    return NextResponse.json(
      { ok: true, amount: payout },
      { status: 200 }
    );

  } catch (error) {
    console.error('Job submission error:', error);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}