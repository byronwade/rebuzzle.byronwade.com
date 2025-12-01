import dotenv from "dotenv";

// Load environment variables before other imports
dotenv.config({ path: ".env.local" });

async function triggerWorkflow() {
  console.log("Testing workflow trigger...");

  const workflowUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/workflows/daily-content`;

  console.log(`Triggering workflow at: ${workflowUrl}`);

  try {
    const response = await fetch(workflowUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        triggeredBy: "test-script",
        triggeredAt: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `❌ Workflow trigger failed with status ${response.status}:`,
        errorText
      );
      return;
    }

    const result = await response.json();

    console.log("\n✅ Workflow triggered successfully!");
    console.log("----------------------------------------");
    console.log("Result:", JSON.stringify(result, null, 2));
    console.log("----------------------------------------");
  } catch (error) {
    console.error("❌ Failed to trigger workflow:", error);
  }
}

triggerWorkflow().catch(console.error);
