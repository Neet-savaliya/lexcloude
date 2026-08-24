import { createContext, useContext, useState } from "react";

const TOKEN_KEY  = "lexcloud_token";
const LAWYER_KEY = "lexcloud_lawyer";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [lawyer, setLawyer] = useState(() => {
    const raw = localStorage.getItem(LAWYER_KEY);
    return raw ? JSON.parse(raw) : null;
  });

  function login(newToken, newLawyer) {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(LAWYER_KEY, JSON.stringify(newLawyer));
    setToken(newToken);
    setLawyer(newLawyer);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LAWYER_KEY);
    setToken(null);
    setLawyer(null);
  }

  return (
    <AuthContext.Provider value={{ token, lawyer, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
