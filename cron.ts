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
  try {
    const today = await getBitcoinNodeData(
      "https://bitnodes.io/api/v1/snapshots/latest/",
    );
    const dayAgo = await findClosestSnapshot(
      dayAgoTimestamp,
      "https://bitnodes.io/api/v1/snapshots?limit=100&page=2",
    );
    const weekAgo = await findClosestSnapshot(
      weekAgoTimestamp,
      "https://bitnodes.io/api/v1/snapshots?limit=100&page=10",
    );
    const resultDayAgo = await getBitcoinNodeData(dayAgo!.url);
    const resultWeekAgo = await getBitcoinNodeData(weekAgo!.url);
    const diffDayAgo = getDifference(today, resultDayAgo);
    const diffWeekAgo = getDifference(today, resultWeekAgo);

    const tweet = `
Today's Bitcoin Node Data:

Total Nodes:  ${today.totalNodes}
Core: ${today.core} (${today.corePercentage.toFixed(2)}%)
Knots: ${today.knots} (${today.knotsPercentage.toFixed(2)}%)
Others: ${today.others} (${today.othersPercentage.toFixed(2)}%)

Since yesterday:
Core: ${checkPositive(diffDayAgo.coreChangePercentage)}%
Knots: ${checkPositive(diffDayAgo.knotsChangePercentage)}%
Others: ${checkPositive(diffDayAgo.othersChangePercentage)}%

Since last week:
Core: ${checkPositive(diffWeekAgo.coreChangePercentage)}%
Knots: ${checkPositive(diffWeekAgo.knotsChangePercentage)}%
Others: ${checkPositive(diffWeekAgo.othersChangePercentage)}%
    `;
    const tweet2 = `
Top 10 Bitcoin  Node Versions:
${today.versions
  .slice(0, 10)
  .map((item) => `${item.version} (${item.count}) - ${item.percentage}%`)
  .join("\n")}
    `;
    const postedTweet = await xClient.v2.tweet(tweet);
    // wait before replying, otherwise Twitter API might reject the reply
    await new Promise((r) => setTimeout(r, 10000));
    await xClient.v2.reply(tweet2, postedTweet.data.id);
    console.log(`Tweet posted successfully: ${new Date().toISOString()}`);
  } catch (error) {
    console.error("Failed to post tweet:", error);
  }
}
// Schedule the task to run daily at 4pm UTC
cron.schedule("0 16 * * *", async () => {
  console.log("Running scheduled task to post Bitcoin node data...");
  await post();
});

const PORT = process.env.PORT || 3000;
http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("BitcoinWhistleX is running\n");
  })
  .listen(PORT, async () => {
    console.log(`Server is listening on port ${PORT}`);
  });
