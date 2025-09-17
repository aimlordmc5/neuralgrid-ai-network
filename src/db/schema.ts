import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  address: text('address').notNull().unique(),
  username: text('username'),
  createdAt: integer('created_at').notNull(),
});

export const computeNodes = sqliteTable('compute_nodes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id).notNull(),
  address: text('address').notNull().unique(),
  computePower: real('compute_power').notNull(),
  reputation: real('reputation').default(100),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  totalEarnings: real('total_earnings').default(0),
  lastHeartbeat: integer('last_heartbeat'),
  createdAt: integer('created_at').notNull(),
});

export const jobs = sqliteTable('jobs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description'),
  reward: integer('reward').notNull(),
  status: text('status').notNull(),
  requiredNodes: integer('required_nodes').notNull(),
  deadline: integer('deadline').notNull(),
  requesterUserId: integer('requester_user_id').references(() => users.id),
  onchainId: integer('onchain_id').unique(),
  onchainTx: text('onchain_tx'),
  createdAt: integer('created_at').notNull(),
});

export const earnings = sqliteTable('earnings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id),
  jobId: integer('job_id').references(() => jobs.id),
  amount: integer('amount').notNull(),
  createdAt: integer('created_at').notNull(),
});