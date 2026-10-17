import { createContext, useContext } from "react";

// Lets the Home and ListEditor screens share the same live list collection
// without prop-drilling through the navigation stack.
export const ListsContext = createContext(null);

export function useLists() {
  const value = useContext(ListsContext);
  if (!value) throw new Error("useLists must be used within ListsContext.Provider");
  return value;
}
