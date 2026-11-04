import { publicApi } from "@/config/api";
import type { Response } from "../types";
import type { Location } from "./types";

export const getLocations = async () => {
  const { data } = await publicApi.get<Response<Location[]>>("/locations");

  return data.data;
};
