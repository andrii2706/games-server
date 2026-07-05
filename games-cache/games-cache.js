import NodeCache from "node-cache";

export const gameDetailsCache = new NodeCache({
  stdTTL: 3600,
  checkperiod: 600,
});
