import { createSlice } from "@reduxjs/toolkit";
import { AUTH_ROLES } from "../../utils/constants";

const uiSlice = createSlice({
  name: "ui",
  initialState: {
    selectedRole: AUTH_ROLES.STUDENT,
  },
  reducers: {
    setSelectedRole(state, action) {
      state.selectedRole = action.payload;
    },
  },
});

export const { setSelectedRole } = uiSlice.actions;
export default uiSlice.reducer;
