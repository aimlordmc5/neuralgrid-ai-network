import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, jobs } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Extract and validate job ID from URL path
    const jobId = parseInt(params.id);
    if (isNaN(jobId)) {
      return NextResponse.json(
        { error: "Valid job ID is required", code: "INVALID_JOB_ID" },
        { status: 400 }
      );
    }

    // Parse request body and validate workerAddress
    const body = await request.json();
    const { workerAddress } = body;

    if (!workerAddress || typeof workerAddress !== 'string') {
      return NextResponse.json(
        { error: "Worker address is required", code: "MISSING_WORKER_ADDRESS" },
        { status: 400 }
      );
    }

    // Normalize the worker address
    const normalizedAddress = workerAddress.toLowerCase();

    // Check if job exists
    const jobsFound = await db.select()
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (jobsFound.length === 0) {
      return NextResponse.json(
        { error: "Job not found", code: "JOB_NOT_FOUND" },
        { status: 404 }
      );
    }

    const job = jobsFound[0];

    // Validate job status is PENDING or ACTIVE
    const joinableStatuses = ["PENDING", "ACTIVE"];
    if (!joinableStatuses.includes(job.status)) {
      return NextResponse.json(
        { error: "Job is not available for joining", code: "JOB_NOT_JOINABLE" },
        { status: 400 }
      );
    }

    // Check if deadline has passed (job.deadline is stored as unix timestamp)
    const currentTime = Date.now();
    
    if (currentTime > job.deadline) {
      return NextResponse.json(
        { error: "Job deadline has passed", code: "DEADLINE_PASSED" },
        { status: 400 }
      );
    }

    // Verify worker user exists or create if not found
    const usersFound = await db.select()
      .from(users)
      .where(eq(users.address, normalizedAddress))
      .limit(1);

    let worker = usersFound[0];

    if (!worker) {
      // Create new user if it doesn't exist
      const newUsers = await db.insert(users)
        .values({
          address: normalizedAddress,
          username: null,
          createdAt: Date.now()
        })
        .returning();

      worker = newUsers[0];
    }

    // Update job status to ACTIVE if it's currently PENDING
    let finalStatus = job.status;
    
    if (job.status === "PENDING") {
      const updatedJobs = await db.update(jobs)
        .set({
          status: "ACTIVE"
        })
        .where(eq(jobs.id, jobId))
        .returning();

      finalStatus = updatedJobs[0].status;
    }

    return NextResponse.json(
      { 
        ok: true,
        status: finalStatus
      },
      { status: 200 }
    );

  } catch (error: unknown) {
    console.error('POST /jobs/join error:', error);
    
    return NextResponse.json(
      { 
        error: "Internal server error", 
        code: "INTERNAL_ERROR" 
      },
      { status: 500 }
    );
  }
}