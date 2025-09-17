import { db } from '@/db';
import { jobs } from '@/db/schema';

async function main() {
    const now = Date.now();
    const sampleJobs = [
        {
            title: 'Image Classification Batch',
            description: 'Process and classify a batch of 500 images for a medical research project. Requires computer vision expertise.',
            reward: 120,
            status: 'PENDING',
            requiredNodes: 5,
            deadline: now + (2 * 60 * 60 * 1000), // 2 hours from now
            requesterUserId: 1,
            createdAt: now,
        },
        {
            title: 'Sentiment Analysis',
            description: 'Analyze customer feedback data to extract sentiment trends from reviews and social media mentions.',
            reward: 75,
            status: 'ACTIVE',
            requiredNodes: 3,
            deadline: now + (50 * 60 * 1000), // 50 minutes from now
            requesterUserId: 1,
            createdAt: now,
        },
        {
            title: 'ETL: CSV → Parquet',
            description: 'Convert large CSV datasets to Parquet format with data validation and transformation rules.',
            reward: 40,
            status: 'PENDING',
            requiredNodes: 2,
            deadline: now + (24 * 60 * 3.6 * 1000), // 1 day from now
            requesterUserId: 1,
            createdAt: now,
        }
    ];

    await db.insert(jobs).values(sampleJobs);
    
    console.log('✅ Jobs seeder completed successfully');
}

main().