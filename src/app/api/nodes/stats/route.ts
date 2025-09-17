import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { computeNodes } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json({ 
        error: "Address query parameter is required",
        code: "MISSING_ADDRESS" 
      }, { status: 400 });
    }

    const nodes = await db
      .select({
        address: computeNodes.address,
        computePower: computeNodes.computePower,
        reputation: computeNodes.reputation,
        isActive: computeNodes.isActive,
        totalEarnings: computeNodes.totalEarnings
      })
      .from(computeNodes)
      .where(eq(computeNodes.address, address))
      .limit(1);

    if (nodes.length === 0) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    const node = nodes[0];
    return NextResponse.json(node);
  } catch (error) {
    console.error('GET node statistics error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}