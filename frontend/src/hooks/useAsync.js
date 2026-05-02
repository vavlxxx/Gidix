import React from "react";

export function useAsync(loader, deps = []) {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await loader();
      setData(result);
      return result;
    } catch (err) {
      setError(err.message || "Не удалось загрузить данные.");
      return null;
    } finally {
      setLoading(false);
    }
  }, deps);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh, setData };
}
