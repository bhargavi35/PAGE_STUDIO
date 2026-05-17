import { configureStore } from "@reduxjs/toolkit";
import draftPage from "@/store/slices/draftPageSlice";
import ui from "@/store/slices/uiSlice";
import publish from "@/store/slices/publishSlice";
import { localStoragePersistMiddleware } from "@/store/localStorageMiddleware";

export const makeStore = () =>
  configureStore({
    reducer: { draftPage, ui, publish },
    middleware: (getDefault) => getDefault().concat(localStoragePersistMiddleware),
    devTools: process.env.NODE_ENV !== "production",
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
