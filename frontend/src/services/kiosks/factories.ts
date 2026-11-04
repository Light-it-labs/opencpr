import { sendKioskHeartbeat } from "./api";

export const mutations = {
  heartbeat: sendKioskHeartbeat,
};
