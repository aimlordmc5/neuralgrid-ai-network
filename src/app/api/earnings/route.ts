import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, earnings, jobs } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!address) {
      return NextResponse.json(
        { error: 'Address parameter is required', code: 'MISSING_ADDRESS' },
        { status: 400 }
      );
    }

    // Find user by address
    const user = await db.select()
      .from(users)
      .where(eq(users.address, address))
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Query earnings with job title for that user
    const earningsList = await db.select({
      id: earnings.id,
      amount: earnings.amount,
      createdAt: earnings.createdAt,
      jobId: earnings.jobId,
      jobTitle: jobs.title
    })
      .from(earnings)
      .innerJoin(jobs, eq(earnings.jobId, jobs.id))
      .where(eq(earnings.userId, user[0].id))
      .orderBy(desc(earnings.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(earningsList);
  } catch (error) {
    console.error('GET earnings error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}