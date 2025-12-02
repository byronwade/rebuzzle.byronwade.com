const { MongoClient } = require("mongodb");

async function testMongoConnection() {
  console.log("🔍 Testing MongoDB connection...");

  // Set the environment variable directly
  const connectionString =
    process.env.MONGODB_URI || "mongodb://localhost:27017/rebuzzle";

  console.log("Connection string:", connectionString);

  try {
    const client = new MongoClient(connectionString);

    console.log("📡 Attempting to connect...");
    await client.connect();

    // Test the connection
    await client.db().admin().ping();
    console.log("✅ Connection successful!");

    // Test a simple operation
    const db = client.db();
    const collections = await db.listCollections().toArray();
    console.log(
      "📊 Available collections:",
      collections.map((c) => c.name)
    );

    await client.close();
    console.log("🔌 Connection closed");
  } catch (error) {
    console.log("❌ Connection failed:");
    console.log("Error message:", error.message);
    console.log("Error code:", error.code);
    console.log("Full error:", error);
  }
}

testMongoConnection();
