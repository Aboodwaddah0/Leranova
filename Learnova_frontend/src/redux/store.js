import { configureStore, createListenerMiddleware } from "@reduxjs/toolkit";
import authReducer, { logout } from "./slices/authSlice";
import adminReducer from "./slices/adminSlice";
import uiReducer from "./slices/uiSlice";
import notificationReducer from "./slices/notificationSlice";
import { clearFcmToken } from "../utils/fcm";

const listenerMiddleware = createListenerMiddleware();

// Whenever any component dispatches logout(), clear the FCM token from the backend
listenerMiddleware.startListening({
  actionCreator: logout,
  effect: () => { clearFcmToken().catch(() => {}); },
});

export const store = configureStore({
  reducer: {
    auth: authReducer,
    admin: adminReducer,
    ui: uiReducer,
    notifications: notificationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(listenerMiddleware.middleware),
});
