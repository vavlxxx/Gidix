import React from "react";
import { authApi, getAccessToken, setAccessToken } from "../api/client";
import { userHasRole } from "../utils/format";

const AuthContext = React.createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = React.useState(null);
  const [ready, setReady] = React.useState(false);

  const loadProfile = React.useCallback(async () => {
    if (!getAccessToken()) {
      setReady(true);
      return null;
    }
    try {
      const profile = await authApi.profile();
      setUser(profile);
      return profile;
    } catch {
      setAccessToken("");
      setUser(null);
      return null;
    } finally {
      setReady(true);
    }
  }, []);

  React.useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function login(data) {
    const tokens = await authApi.login(data);
    setAccessToken(tokens.access_token);
    return loadProfile();
  }

  async function register(data) {
    await authApi.register(data);
    return login({ email: data.email, password: data.password });
  }

  async function logout() {
    await authApi.logout().catch(() => null);
    setAccessToken("");
    setUser(null);
  }

  const value = React.useMemo(() => ({
    user,
    ready,
    login,
    register,
    logout,
    isStaff: userHasRole(user, ["admin", "superuser", "manager", "dispatcher", "guide", "accountant", "it_specialist"])
  }), [user, ready]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return React.useContext(AuthContext);
}
