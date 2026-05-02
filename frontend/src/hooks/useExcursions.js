import { excursionsApi } from "../api/client";
import { useAsync } from "./useAsync";

export function useExcursions(publicOnly = true) {
  const state = useAsync(() => excursionsApi.list(publicOnly), [publicOnly]);
  return {
    ...state,
    excursions: state.data || []
  };
}
