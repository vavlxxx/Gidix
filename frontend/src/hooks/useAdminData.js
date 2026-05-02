import { adminApi, bookingsApi, excursionsApi } from "../api/client";
import { useAsync } from "./useAsync";

export function useAdminData() {
  const state = useAsync(async () => {
    const [points, routes, excursions, bookings, sessions, health] = await Promise.all([
      adminApi.points().catch(() => []),
      adminApi.routes().catch(() => []),
      excursionsApi.list().catch(() => []),
      bookingsApi.list().catch(() => []),
      adminApi.sessions().catch(() => []),
      adminApi.health().catch(() => [])
    ]);
    return { points, routes, excursions, bookings, sessions, health };
  }, []);

  return {
    ...state,
    state: state.data || { points: [], routes: [], excursions: [], bookings: [], sessions: [], health: [] }
  };
}
