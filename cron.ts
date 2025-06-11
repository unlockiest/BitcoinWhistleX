import cron from "node-cron";
import {
  findClosestSnapshot,
  getBitcoinNodeData,
  Result,
} from "./api/bitnodes";
import xClient from "./account";

function checkPositive(value: number): string {
  return value > 0 ? "+" : "";
}

function getDifference(resultCurrent: Result, resultOld: Result) {
  const coreChangePercentage =
    Math.round(
      (resultCurrent.corePercentage - resultOld.corePercentage) * 100,
    ) / 100;
  const knotsChangePercentage =
    Math.round(
      (resultCurrent.knotsPercentage - resultOld.knotsPercentage) * 100,
    ) / 100;
  const othersChangePercentage =
    Math.round(
      (resultCurrent.othersPercentage - resultOld.othersPercentage) * 100,
    ) / 100;

  return {
    coreChangePercentage,
    knotsChangePercentage,
    othersChangePercentage,
  };
}

async function post() {
  const dayAgoTimestamp = Math.floor(Date.now() / 1000) - 86400;
  const weekAgoTimestamp = Math.floor(Date.now() / 1000) - 604800;
  const dayAgoSnapshot = await findClosestSnapshot(dayAgoTimestamp);
  const weekAgoSnapshot = await findClosestSnapshot(weekAgoTimestamp);
  try {
    const result = await getBitcoinNodeData(
      "https://bitnodes.io/api/v1/snapshots/latest/",
    );
    const resultDayAgo = await getBitcoinNodeData(dayAgoSnapshot!.url);
    const resultWeekAgo = await getBitcoinNodeData(weekAgoSnapshot!.url);
    const diffDayAgo = getDifference(result, resultDayAgo);
    const diffWeekAgo = getDifference(result, resultWeekAgo);

    const tweet = `
Bitcoin Node Data:

Total Nodes:  ${result.totalNodes}
Core: ${result.core} (${result.corePercentage.toFixed(2)}%)
Knots: ${result.knots} (${result.knotsPercentage.toFixed(2)}%)
Others: ${result.others} (${result.othersPercentage.toFixed(2)}%)

Since last day:
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
cron.schedule("0 16 * * *", async () => {
  console.log(
    "Running scheduled task to post Bitcoin node data...",
    new Date().toISOString(),
  );
  await post();
});

(async function () {
  await post();
})();
