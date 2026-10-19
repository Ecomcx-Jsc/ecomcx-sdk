// Shim: plugin import "react" → dùng chung React của admin (không bundle React thứ hai).
import { host } from "./host";

const React = host().React;
export default React;
export const {
  Children, Component, Fragment, PureComponent, StrictMode, Suspense,
  cloneElement, createContext, createElement, createRef, forwardRef, isValidElement, lazy, memo, startTransition,
  use, useActionState, useCallback, useContext, useDebugValue, useDeferredValue, useEffect, useId, useImperativeHandle,
  useInsertionEffect, useLayoutEffect, useMemo, useOptimistic, useReducer, useRef, useState, useSyncExternalStore, useTransition,
} = React;
