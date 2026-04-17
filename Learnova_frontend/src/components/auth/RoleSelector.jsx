import { useDispatch, useSelector } from "react-redux";
import { setSelectedRole } from "../../redux/slices/uiSlice";
import { setAuthRole, clearAuthError } from "../../redux/slices/authSlice";
import { AUTH_ROLES } from "../../utils/constants";

export default function RoleSelector({ t }) {
  const dispatch = useDispatch();
  const selectedRole = useSelector((state) => state.ui.selectedRole);

  const options = [
    { value: AUTH_ROLES.STUDENT, label: t.roles.student },
    { value: AUTH_ROLES.PARENT, label: t.roles.parent },
    { value: AUTH_ROLES.INSTRUCTOR, label: t.roles.instructor },
    { value: AUTH_ROLES.ORGANIZATION, label: t.roles.organization },
  ];

  const onChange = (event) => {
    const role = event.target.value;
    dispatch(setSelectedRole(role));
    dispatch(setAuthRole(role));
    dispatch(clearAuthError());
  };

  return (
    <div className="space-y-2">
      <label
        htmlFor="role"
        className="px-1 text-xs font-bold uppercase tracking-widest text-slate-500"
      >
        {t.login.roleLabel}
      </label>
      <select
        id="role"
        value={selectedRole}
        onChange={onChange}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 font-medium text-slate-700 outline-none transition focus:border-cyan-500"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
