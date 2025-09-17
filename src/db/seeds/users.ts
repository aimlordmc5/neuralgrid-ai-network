import { db } from '@/db';
import { users } from '@/db/schema';

async function main() {
    const sampleUsers = [
        {
            address: '0x1111111111111111111111111111111111111111',
            username: null,
            createdAt: Date.now(),
        },
        {
            address: '0x2222222222222222222222222222222222222222',
            username: null,
            createdAt: Date.now(),
        }
    ];

    await db.insert(users).values(sampleUsers);
    
    console.log('✅ Users seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});