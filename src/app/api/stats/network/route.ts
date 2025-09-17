import { NextResponse } from "next/server";
import { db } from '@/db';
import { computeNodes, jobs, earnings } from '@/db/schema';
import { count, sum, inArray } from 'drizzle-orm';

// GET network stats from database
export async function GET() {
  try {
    // Get total nodes count
    const totalNodesResult = await db.select({ count: count() }).from(computeNodes);
    const totalNodes = totalNodesResult[0].count;

    // Get active jobs count (PENDING and ACTIVE status)
    const activeJobsResult = await db.select({ count: count() })
      .from(jobs)
      .where(inArray(jobs.status, ['PENDING', 'ACTIVE']));
    const activeJobs = activeJobsResult[0].count;

    // Get total rewards (sum of all earnings)
    const totalRewardsResult = await db.select({ total: sum(earnings.amount) }).from(earnings);
    const totalRewards = totalRewardsResult[0].total || 0;

    const stats = {
      totalNodes,
      activeJobs,
      totalRewards,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Network stats error:', error);
    return NextResponse.json({ error: 'Internal server error: ' + error }, { status: 500 });
  }
}