-- First, drop the foreign key constraint
ALTER TABLE "push_subscriptions" DROP CONSTRAINT IF EXISTS "push_subscriptions_user_id_fkey";

-- Then, change the column type to TEXT
ALTER TABLE "push_subscriptions" ALTER COLUMN "user_id" TYPE TEXT;
