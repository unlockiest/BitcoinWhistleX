interface Data {
  timestamp: number;
  total_nodes: number;
  latest_height: number;
  nodes: Record<string, BtcNode>;
}

type BtcNode = [
  protocolVersion: number,             // e.g. 70016
  userAgent: string,                   // e.g. "/Satoshi:28.1.0/Knots:20250305/"
  lastSeen: number,                    // Unix timestamp
  serviceFlags: number,                // bitflags, e.g. 67109901
  height: number,                      // block height
  agentAddress: string | null,        // not always present
  subver: string | null,              // optional
  inbound: boolean | null,            // optional
  startingHeight: number,             // often 0
  banscore: number,                   // often 0
  syncedHeaders: number | null,       // may be null
  networkType: string,                // e.g. "TOR", "IPv4", "IPv6"
  networkDesc: string                 // e.g. "Tor network"
];

type ClientCounts = Record<string, number>;

interface Result {
  knots: number;
  core: number;
  others: number;
  knotsPercentage: number;
  corePercentage: number;
  othersPercentage: number;
}

async function getBitcoinClientCounts(): Promise<Result> {
  const response = await fetch('https://bitnodes.io/api/v1/snapshots/latest/');

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
  };

  for (const entry in data.nodes) {
    const userAgent = data.nodes[entry][1];
    console.log({ userAgent });
    // Ensure compatibility with 'includes' method
    const isKnots = userAgent.toLowerCase().includes('knots');
    const isCore = userAgent.toLowerCase().includes('satoshi');
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
  const total = result.knots + result.core + result.others;
  if (total > 0) {
    result.knotsPercentage = ((result.knots / total) * 100).toFixed(2);
    result.corePercentage = ((result.core / total) * 100).toFixed(2);
    result.othersPercentage = ((result.others / total) * 100).toFixed(2);
  }

  return result;
}

// Example usage:
getBitcoinClientCounts()
  .then(result => console.log("Results:", result))
  .catch(error => console.error("Error:", error));
