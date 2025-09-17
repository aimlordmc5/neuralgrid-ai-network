import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { jobs, users } from '@/db/schema';
import { eq, like, or, inArray } from 'drizzle-orm';

// Helper function to convert unix timestamp to human readable format
function formatDeadline(deadlineTimestamp: number): string {
  const now = Date.now();
  const diff = deadlineTimestamp - now;
  
  if (diff <= 0) return "expired";
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days >= 1) return `in ${days}d`;
  if (hours >= 1) return `in ${hours}h`;
  return `in ${minutes}m`;
}

// Helper function to parse relative time strings to unix timestamp
function parseDeadline(deadline: string): number {
  if (deadline.includes('T') || deadline.includes('-')) {
    // ISO string
    return new Date(deadline).getTime();
  }
  
  // Relative time format like "in 2h", "in 50m", "in 1d"
  const match = deadline.match(/in (\d+)([mhd])/);
  if (!match) {
    throw new Error('Invalid deadline format');
  }
  
  const value = parseInt(match[1]);
  const unit = match[2];
  const now = Date.now();
  
  switch (unit) {
    case 'm': return now + (value * 60 * 1000);
    case 'h': return now + (value * 60 * 60 * 1000);
    case 'd': return now + (value * 24 * 60 * 60 * 1000);
    default: throw new Error('Invalid time unit');
  }
}

// GET handler - Read jobs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    
    if (id) {
      const record = await db.select().from(jobs).where(eq(jobs.id, parseInt(id))).limit(1);
      if (record.length === 0) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
      
      const job = record[0];
      return NextResponse.json({
        id: job.id,
        title: job.title,
        reward: `${job.reward} NGR`,
        deadline: formatDeadline(job.deadline),
        requiredNodes: job.requiredNodes,
        status: job.status,
        onchainId: job.onchainId,
        onchainTx: job.onchainTx
      });
    } else {
      let query = db.select().from(jobs);
      
      if (search) {
        query = query.where(
          or(
            like(jobs.title, `%${search}%`),
            like(jobs.description, `%${search}%`)
          )
        );
      }
      
      const records = await query.limit(limit).offset(offset);
      const formattedJobs = records.map(job => ({
        id: job.id,
        title: job.title,
        reward: `${job.reward} NGR`,
        deadline: formatDeadline(job.deadline),
        requiredNodes: job.requiredNodes,
        status: job.status,
        onchainId: job.onchainId,
        onchainTx: job.onchainTx
      }));
      
      return NextResponse.json(formattedJobs);
    }
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST handler - Create job
export async function POST(request: NextRequest) {
  try {
    const { title, description, reward, requiredNodes, deadline, requesterAddress, onchainId, onchainTx } = await request.json();
    
    // Validate required fields
    if (!title || !reward || !requiredNodes || !deadline || !requesterAddress) {
      return NextResponse.json({ 
        error: "Title, reward, requiredNodes, deadline, and requesterAddress are required", 
        code: "MISSING_REQUIRED_FIELDS" 
      }, { status: 400 });
    }

    // Validate onchainId uniqueness if provided
    if (onchainId !== undefined && onchainId !== null) {
      const existingJob = await db.select().from(jobs).where(eq(jobs.onchainId, parseInt(onchainId))).limit(1);
      if (existingJob.length > 0) {
        return NextResponse.json({ 
          error: "Job with this onchainId already exists", 
          code: "DUPLICATE_ONCHAIN_ID" 
        }, { status: 409 });
      }
    }

    // Parse deadline
    let deadlineTimestamp: number;
    try {
      deadlineTimestamp = parseDeadline(deadline);
    } catch (error) {
      return NextResponse.json({ 
        error: "Invalid deadline format. Use ISO string or relative format like 'in 2h'", 
        code: "INVALID_DEADLINE" 
      }, { status: 400 });
    }

    // Ensure requester user exists by address
    let user = await db.select().from(users).where(eq(users.address, requesterAddress.toLowerCase())).limit(1);
    let userId: number;

    if (user.length === 0) {
      // Create new user
      const newUser = await db.insert(users).values({
        address: requesterAddress.toLowerCase(),
        username: null,
        createdAt: Date.now()
      }).returning();
      userId = newUser[0].id;
    } else {
      userId = user[0].id;
    }
    
    const newRecord = await db.insert(jobs).values({
      title: title.trim(),
      description: description?.trim() || null,
      reward: parseInt(reward),
      status: 'PENDING',
      requiredNodes: parseInt(requiredNodes),
      deadline: deadlineTimestamp,
      requesterUserId: userId,
      onchainId: onchainId !== undefined ? parseInt(onchainId) : null,
      onchainTx: onchainTx || null,
      createdAt: Date.now(),
    }).returning();
    
    const job = newRecord[0];
    return NextResponse.json({
      id: job.id,
      title: job.title,
      reward: `${job.reward} NGR`,
      deadline: formatDeadline(job.deadline),
      requiredNodes: job.requiredNodes,
      status: job.status,
      onchainId: job.onchainId,
      onchainTx: job.onchainTx
    }, { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ error: 'Internal server error: ' + error }, { status: 500 });
  }
}