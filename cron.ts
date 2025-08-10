import cron from "node-cron";
import http from "http";
import "dotenv/config";
import {
  fetchSnapshot,
  findClosestSnapshot,
  getBitcoinNodeData,
  getDifference,
  BitnodesData,
} from "./api/bitnodes";
import { checkPositive } from "./helpers/helpers";
import xClient from "./account";
import { snapshotLatest } from "./api/mock/snapshotLatest";
import { snapshotDayAgo } from "./api/mock/snapshotDayAgo";
import { snapshotWeekAgo } from "./api/mock/snapshotWeekAgo";

async function post(isMock: boolean) {
  const dayAgoTimestamp = Math.floor(Date.now() / 1000) - 86400;
  const weekAgoTimestamp = Math.floor(Date.now() / 1000) - 604800;
  try {
    let responseLatest: BitnodesData;
    let responseDayAgo: BitnodesData;
    let responseWeekAgo: BitnodesData;
    if (isMock) {
      responseLatest = snapshotLatest;
      responseDayAgo = snapshotDayAgo;
      responseWeekAgo = snapshotWeekAgo;
    } else {
      const dayAgo = await findClosestSnapshot(
        dayAgoTimestamp,
        "https://bitnodes.io/api/v1/snapshots?limit=100&page=2",
      );
      const weekAgo = await findClosestSnapshot(
        weekAgoTimestamp,
        "https://bitnodes.io/api/v1/snapshots?limit=100&page=10",
      );
      responseLatest = await fetchSnapshot(
        "https://bitnodes.io/api/v1/snapshots/latest/",
      );
      responseDayAgo = await fetchSnapshot(dayAgo!.url);
      responseWeekAgo = await fetchSnapshot(weekAgo!.url);
    }
    const resultToday = await getBitcoinNodeData(responseLatest);
    const resultDayAgo = await getBitcoinNodeData(responseDayAgo);
    const resultWeekAgo = await getBitcoinNodeData(responseWeekAgo);
    const diffDayAgo = getDifference(resultToday, resultDayAgo);
    const diffWeekAgo = getDifference(resultToday, resultWeekAgo);

    const tweet = `
Today's Bitcoin Node Data:

Total Nodes:  ${resultToday.totalNodes}
Core: ${resultToday.core} (${resultToday.corePercentage.toFixed(2)}%)
Knots: ${resultToday.knots} (${resultToday.knotsPercentage.toFixed(2)}%)
Others: ${resultToday.others} (${resultToday.othersPercentage.toFixed(2)}%)

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
${resultToday.versions
  .slice(0, 10)
  .map((item) => `${item.version} (${item.count}) - ${item.percentage}%`)
  .join("\n")}
    `;
    if (isMock) {
      console.log("Mock data for tweet:", tweet);
      console.log("Mock data for tweet2:", tweet2);
    } else {
      const postedTweet = await xClient.v2.tweet(tweet);
      // wait before replying, otherwise Twitter API might reject the reply
      await new Promise((r) => setTimeout(r, 60000));
      await xClient.v2.reply(tweet2, postedTweet.data.id);
      console.log(`Tweet posted successfully: ${new Date().toISOString()}`);
    }
  } catch (error) {
    console.error("Failed to post tweet:", error);
  }
}

const isMock = process.env.NODE_ENV === "development";
// Schedule the task to run daily at 4pm UTC
cron.schedule("0 16 * * *", async () => {
  if (isMock) {
    console.warn("app is running using mock data");
  }
  console.log("Running scheduled task to post Bitcoin node data...");
  await post(isMock);
});

(async function () {
  if (isMock) {
    console.warn("app is running using mock data");
    await post(isMock);
    console.warn("app is running using mock data");
  }
})();

const PORT = process.env.PORT || 3000;
http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("BitcoinWhistleX is running\n");
  })
  .listen(PORT, async () => {
    console.log(`Server is listening on port ${PORT}`);
  });
