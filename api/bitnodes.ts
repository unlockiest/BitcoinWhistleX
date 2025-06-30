interface BitnodesData {
  timestamp: number;
  total_nodes: number;
  latest_height: number;
  nodes: Record<string, BtcNode>;
}

type BtcNode = [
  protocolVersion: number, // e.g. 70016
  userAgent: string, // e.g. "/Satoshi:28.1.0/Knots:20250305/"
  lastSeen: number, // Unix timestamp
  serviceFlags: number, // bitflags, e.g. 67109901
  height: number, // block height
  agentAddress: string | null, // not always present
  subver: string | null, // optional
  inbound: boolean | null, // optional
  startingHeight: number, // often 0
  banscore: number, // often 0
  syncedHeaders: number | null, // may be null
  networkType: string, // e.g. "TOR", "IPv4", "IPv6"
  networkDesc: string, // e.g. "Tor network"
];

interface Version {
  version: string;
  count: number;
  percentage: number;
}

export interface NodesData {
  knots: number;
  core: number;
  btcd: number;
  toshi: number;
  libbitcoin: number;
  nbitcoin: number;
  others: number;
  knotsPercentage: number;
  corePercentage: number;
  othersPercentage: number;
  totalNodes: number;
  versions: Version[];
}

interface Snapshot {
  url: string;
  timestamp: number;
  total_nodes: number;
  latest_height: number;
}

interface SnapshotResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Snapshot[];
}

export function getSnapshots(
  url: string = "https://bitnodes.io/api/v1/snapshots/latest/?limit=100",
): Promise<SnapshotResponse> {
  return fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch snapshots: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => data as SnapshotResponse);
}

export async function getBitcoinNodeData(url: string): Promise<NodesData> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch user agent data: ${response.status}`);
  }

  const data: BitnodesData = await response.json();

  const result: NodesData = {
    totalNodes: data.total_nodes,
    knots: 0,
    core: 0,
    others: 0,
    btcd: 0,
    toshi: 0,
    libbitcoin: 0,
    nbitcoin: 0,
    knotsPercentage: 0,
    corePercentage: 0,
    othersPercentage: 0,
    versions: [],
  };

  for (const entry in data.nodes) {
    const userAgent = data.nodes[entry][1];
    // Ensure compatibility with 'includes' method
    const isKnots = userAgent.toLowerCase().includes("knots");
    const isBtcd = userAgent.toLowerCase().includes("btcd"); // identified
    const isLibbitcoin = userAgent.toLowerCase().includes("libbitcoin");
    const isNBitcoin = userAgent.toLowerCase().includes("nbitcoin");
    const isCore = userAgent.toLowerCase().includes("satoshi");
    const isToshi = userAgent.toLowerCase().includes("toshi");
    if (isKnots) {
      result.knots++;
      const version = `Knots: v.${userAgent.match(/knots:(.*?)\//i)?.[1]}`;
      if (version) {
        const existingVersion = result.versions.find(
          (v) => v.version === version,
        );
        if (existingVersion) {
          existingVersion.count++;
        } else {
          result.versions.push({ version, count: 1, percentage: 0 });
        }
      }
    } else if (isBtcd) {
      result.btcd++;
    } else if (isLibbitcoin) {
      result.libbitcoin++;
    } else if (isNBitcoin) {
      result.nbitcoin++;
    } else if (isCore) {
      result.core++;
      const coreVersion = `Core: v.${userAgent.match(/Satoshi:([\d\.]+)/)?.[1]}`;
      if (coreVersion) {
        const existingVersion = result.versions.find(
          (v) => v.version === coreVersion,
        );
        if (existingVersion) {
          existingVersion.count++;
        } else {
          result.versions.push({
            version: coreVersion,
            count: 1,
            percentage: 0,
          });
        }
      }
    } else if (isToshi) {
      result.toshi++;
    } else {
      result.others++;
    }
  }

  // Calculate percentages
  const total = data.total_nodes;
  if (total > 0) {
    result.knotsPercentage = (result.knots / total) * 100;
    result.corePercentage = (result.core / total) * 100;
    result.othersPercentage = (result.others / total) * 100;
  }

  // Calculate percentages for versions
  result.versions.forEach((version) => {
    version.percentage = Number(
      ((version.count / result.totalNodes) * 100).toFixed(2),
    );
  });
  // Sort versions by percentage in descending order
  result.versions.sort((a, b) => b.percentage - a.percentage);

  return result;
}

export async function findClosestSnapshot(
  timestamp: number,
  startUrl: string,
): Promise<Snapshot | null> {
  let nextUrl: string | null = startUrl;
  let closestSnapshot: Snapshot | null = null;

  while (!closestSnapshot) {
    const snapshotsResponse = await getSnapshots(nextUrl as string);
    for (const snapshot of snapshotsResponse.results) {
      if (snapshot.timestamp <= timestamp) {
        closestSnapshot = snapshot;
      }
    }
    nextUrl = snapshotsResponse.next;
  }

  return closestSnapshot;
}

export function getDifference(resultCurrent: NodesData, resultOld: NodesData) {
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

  const totalNodesChange = resultCurrent.totalNodes - resultOld.totalNodes;

  return {
    coreChangePercentage,
    knotsChangePercentage,
    othersChangePercentage,
    totalNodesChange,
  };
}
