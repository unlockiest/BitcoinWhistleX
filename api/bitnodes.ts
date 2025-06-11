interface Data {
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

export interface Result {
  knots: number;
  core: number;
  others: number;
  knotsPercentage: number;
  corePercentage: number;
  othersPercentage: number;
  totalNodes: number;
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

export async function getBitcoinNodeData(url: string): Promise<Result> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch user agent data: ${response.status}`);
  }

  const data: Data = await response.json();

  const result: Result = {
    knots: 0,
    core: 0,
    others: 0,
    knotsPercentage: 0,
    corePercentage: 0,
    othersPercentage: 0,
    totalNodes: data.total_nodes,
  };

  for (const entry in data.nodes) {
    const userAgent = data.nodes[entry][1];
    //console.log({ userAgent });
    // Ensure compatibility with 'includes' method
    const isKnots = userAgent.toLowerCase().includes("knots");
    const isCore = userAgent.toLowerCase().includes("satoshi");
    const isOther = !isKnots && !isCore;
    if (isKnots) {
      result.knots++;
    } else if (isCore) {
      result.core++;
    } else if (isOther) {
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

  return result;
}

export async function findClosestSnapshot(
  timestamp: number,
): Promise<Snapshot | null> {
  let nextUrl: string | null =
    "https://bitnodes.io/api/v1/snapshots?limit=100&page=2";
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
