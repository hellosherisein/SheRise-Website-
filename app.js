import "dotenv/config";

// LiteSpeed loads this entry with require(). Keep its static ESM graph
// synchronous; the server performs asynchronous initialization after import().
import("./server/hostinger.mjs").catch(() => {
  console.error("SheRise server failed to start. Check the server build and Node.js version.");
  process.exitCode = 1;
});
