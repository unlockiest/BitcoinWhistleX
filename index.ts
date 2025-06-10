import { getBitcoinNodeData } from "./api/bitnodes";

// Example usage:
getBitcoinNodeData()
  .then((result) => console.log("Results:", result))
  .catch((error) => console.error("Error:", error));
