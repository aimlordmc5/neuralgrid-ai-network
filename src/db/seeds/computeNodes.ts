import { db } from '@/db';
import { computeNodes } from '@/db/schema';

async function main() {
    const sampleComputeNodes = [
        {
            userId: 1,
            address: '0x1111111111111111111111111111111111111111',
            computePower: 85.5,
            reputation: 100,
            isActive: true,
            totalEarnings: 0,
            lastHeartbeat: null,
            createdAt: Date.now(),
        },
        {
            userId: 2,
            address: '0x2222222222222222222222222222222222222222',
            computePower: 120.3,
            reputation: 100,
            isActive: true,
            totalEarnings: 0,
            lastHeartbeat: null,
            createdAt: Date.now(),
        }
    ];

    await db.insert(computeNodes).values(sampleComputeNodes);
    
    console.log('✅ ComputeNodes seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});