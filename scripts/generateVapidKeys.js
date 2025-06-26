const webpush = require("web-push");

console.log("Generating VAPID keys for web push notifications...\n");

const vapidKeys = webpush.generateVAPIDKeys();

console.log("VAPID Keys Generated:");
console.log("==================");
console.log("Public Key:", vapidKeys.publicKey);
console.log("Private Key:", vapidKeys.privateKey);
console.log("\nAdd these to your .env file:");
console.log("============================");
console.log(`VAPID_PUBLIC_KEY="${vapidKeys.publicKey}"`);
console.log(`VAPID_PRIVATE_KEY="${vapidKeys.privateKey}"`);
console.log(`VAPID_EMAIL="your-email@example.com"`);
console.log(`CRON_SECRET="your-secure-random-string"`);
console.log('\nMake sure to replace "your-email@example.com" with your actual email address.');
console.log("The CRON_SECRET should be a secure random string to protect your cron endpoint.");
