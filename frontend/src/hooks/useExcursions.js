import { excursionsApi } from "../api/client";
import { useAsync } from "./useAsync";

export function useExcursions() {
  const state = useAsync(() => excursionsApi.list(), []);
  return {
    ...state,
    excursions: state.data || []
  };
}
