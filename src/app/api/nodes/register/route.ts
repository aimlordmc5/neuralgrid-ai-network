import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, computeNodes } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, computePower } = body;

    // Validate required fields
    if (!address || typeof address !== 'string' || address.trim() === '') {
      return NextResponse.json({ 
        error: 'Address is required and must be a valid string',
        code: 'MISSING_ADDRESS'
      }, { status: 400 });
    }

    if (computePower === undefined || computePower === null || isNaN(Number(computePower)) || Number(computePower) <= 0) {
      return NextResponse.json({ 
        error: 'Compute power is required and must be a positive number',
        code: 'INVALID_COMPUTE_POWER'
      }, { status: 400 });
    }

    // Check if user exists by address, create if not
    let user = await db.select()
      .from(users)
      .where(eq(users.address, address.toLowerCase()))
      .limit(1);

    let userId: number;

    if (user.length === 0) {
      // Create new user
      const newUser = await db.insert(users)
        .values({
          address: address.toLowerCase(),
          username: null,
          createdAt: Date.now()
        })
        .returning();
      
      userId = newUser[0].id;
    } else {
      userId = user[0].id;
    }

    // Check if node already exists for this address
    const existingNode = await db.select()
      .from(computeNodes)
      .where(eq(computeNodes.address, address.toLowerCase()))
      .limit(1);

    let node;
    const currentTimestamp = Date.now();

    if (existingNode.length > 0) {
      // Update existing node (only fields that exist in schema)
      const updatedNodes = await db.update(computeNodes)
        .set({
          computePower: Number(computePower),
          // updatedAt removed (not in schema)
        })
        .where(eq(computeNodes.address, address.toLowerCase()))
        .returning();
      
      node = updatedNodes[0];
    } else {
      // Insert new node (only fields that exist in schema)
      const newNodes = await db.insert(computeNodes)
        .values({
          userId: userId,
          address: address.toLowerCase(),
          computePower: Number(computePower),
          reputation: 100,
          isActive: true,
          totalEarnings: 0,
          lastHeartbeat: null,
          createdAt: currentTimestamp,
          // updatedAt removed (not in schema)
        })
        .returning();
      
      node = newNodes[0];
    }

    // Return node summary
    return NextResponse.json({
      address: node.address,
      computePower: node.computePower,
      reputation: node.reputation,
      isActive: node.isActive
    }, { status: 201 });

  } catch (error) {
    console.error('Node registration error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}