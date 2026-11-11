import { pairKiosk, sendKioskHeartbeat } from "./api";

export const mutations = {
  heartbeat: sendKioskHeartbeat,
  pair: pairKiosk,
};
