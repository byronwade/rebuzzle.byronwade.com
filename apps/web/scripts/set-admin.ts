/**
 * Script to set admin permissions for a user
 *
 * Usage: npx tsx scripts/set-admin.ts <email> [true|false]
 * Example: npx tsx scripts/set-admin.ts bcw1995@gmail.com true
 */

import type { User } from "../src/db/models";
import {
  closeConnection,
  getCollection,
  getConnection,
} from "../src/db/mongodb";

async function setAdminPermission(email: string, isAdmin: boolean) {
  try {
    // Connect to database
    const client = getConnection();
    if (!client.topology?.isConnected()) {
      await client.connect();
    }

    const usersCollection = getCollection<User>("users");
    const user = await usersCollection.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.error(`❌ User with email ${email} not found`);
      process.exit(1);
    }

    await usersCollection.updateOne(
      { email: email.toLowerCase() },
      { $set: { isAdmin } }
    );

    console.log(
      `✅ Successfully ${isAdmin ? "granted" : "revoked"} admin permission for ${email}`
    );
    console.log(`   User ID: ${user.id}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Admin Status: ${isAdmin ? "ADMIN" : "Regular User"}`);
  } catch (error) {
    console.error("❌ Error setting admin permission:", error);
    process.exit(1);
  } finally {
    await closeConnection();
    process.exit(0);
  }
}

// Get command line arguments
const email = process.argv[2];
const adminFlag = process.argv[3];

if (!email) {
  console.error("❌ Usage: npx tsx scripts/set-admin.ts <email> [true|false]");
  console.error(
    "   Example: npx tsx scripts/set-admin.ts bcw1995@gmail.com true"
  );
  process.exit(1);
}

const isAdmin = adminFlag !== "false"; // Default to true if not specified

setAdminPermission(email, isAdmin);
