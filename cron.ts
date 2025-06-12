import cron from "node-cron";
import http from "http";
import {
  findClosestSnapshot,
  getBitcoinNodeData,
  getDifference,
} from "./api/bitnodes";
import { checkPositive } from "./helpers/helpers";
import xClient from "./account";

async function post() {
  const dayAgoTimestamp = Math.floor(Date.now() / 1000) - 86400;
  const weekAgoTimestamp = Math.floor(Date.now() / 1000) - 604800;
  const dayAgoSnapshot = await findClosestSnapshot(
    dayAgoTimestamp,
    "https://bitnodes.io/api/v1/snapshots?limit=100&page=2",
  );
  const weekAgoSnapshot = await findClosestSnapshot(
    weekAgoTimestamp,
    "https://bitnodes.io/api/v1/snapshots?limit=100&page=10",
  );
  try {
    const result = await getBitcoinNodeData(
      "https://bitnodes.io/api/v1/snapshots/latest/",
    );
    const resultDayAgo = await getBitcoinNodeData(dayAgoSnapshot!.url);
    const resultWeekAgo = await getBitcoinNodeData(weekAgoSnapshot!.url);
    const diffDayAgo = getDifference(result, resultDayAgo);
    const diffWeekAgo = getDifference(result, resultWeekAgo);

    const tweet = `
Today's Bitcoin Node Data:

Total Nodes:  ${result.totalNodes}
Core: ${result.core} (${result.corePercentage.toFixed(2)}%)
Knots: ${result.knots} (${result.knotsPercentage.toFixed(2)}%)
Others: ${result.others} (${result.othersPercentage.toFixed(2)}%)

Since yesterday:
Core: ${checkPositive(diffDayAgo.coreChangePercentage)}${diffDayAgo.coreChangePercentage}%
Knots: ${checkPositive(diffDayAgo.knotsChangePercentage)}${diffDayAgo.knotsChangePercentage}%
Others: ${checkPositive(diffDayAgo.othersChangePercentage)}${diffDayAgo.othersChangePercentage}%

Since last week:
Core: ${checkPositive(diffWeekAgo.coreChangePercentage)}${diffWeekAgo.coreChangePercentage}%
Knots: ${checkPositive(diffWeekAgo.knotsChangePercentage)}${diffWeekAgo.knotsChangePercentage}%
Others: ${checkPositive(diffWeekAgo.othersChangePercentage)}${diffWeekAgo.othersChangePercentage}%
    `;

    await xClient.v2.tweet(tweet);
    console.log("Tweet posted successfully:", tweet);
  } catch (error) {
    console.error("Failed to post tweet:", error);
  }
}
// Schedule the task to run daily at 4pm UTC
cron.schedule("0 4,16 * * *", async () => {
  console.log(
    "Running scheduled task to post Bitcoin node data...",
    new Date().toISOString(),
  );
  await post();
});

const PORT = process.env.PORT || 3000;
http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("BitcoinWhistleX is running\n");
  })
  .listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
  });
