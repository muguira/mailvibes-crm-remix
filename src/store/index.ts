import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { subscribeWithSelector } from "zustand/middleware";
import { TStore } from "@/types/store";

export const useStore = create<TStore>()(
  subscribeWithSelector(immer((set) => ({})))
);
