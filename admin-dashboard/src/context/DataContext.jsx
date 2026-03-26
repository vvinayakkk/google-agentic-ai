import { createContext, useContext, useMemo, useReducer } from "react";

const DataContext = createContext(null);

const initialState = {
  cache: {},
  loading: {},
  errors: {},
};

const reducer = (state, action) => {
  switch (action.type) {
    case "SET_LOADING":
      return {
        ...state,
        loading: { ...state.loading, [action.key]: action.value },
      };
    case "SET_ERROR":
      return {
        ...state,
        errors: { ...state.errors, [action.key]: action.value },
      };
    case "SET_CACHE":
      return {
        ...state,
        cache: { ...state.cache, [action.key]: action.value },
      };
    default:
      return state;
  }
};

export const DataProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const value = useMemo(
    () => ({
      cache: state.cache,
      loading: state.loading,
      errors: state.errors,
      setLoading: (key, value) => dispatch({ type: "SET_LOADING", key, value }),
      setError: (key, value) => dispatch({ type: "SET_ERROR", key, value }),
      setCache: (key, value) => dispatch({ type: "SET_CACHE", key, value }),
    }),
    [state]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used inside DataProvider");
  return context;
};

