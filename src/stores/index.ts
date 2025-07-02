import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { subscribeWithSelector } from "zustand/middleware";
import { TStore } from "@/types/store/store";
import { useTasksSlice } from "./useTasksSlice";

export const useStore = create<TStore>()(
  subscribeWithSelector(
    immer((...a) => ({
      ...useTasksSlice(...a),
    }))
  )
);
