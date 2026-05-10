import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { loginThunk } from "../../redux/thunks/authThunks";
import { setAuthRole } from "../../redux/slices/authSlice";
import { AUTH_ROLES } from "../../utils/constants";
import { notifyError } from "../../lib/notify";

const rolePaths = {
  [AUTH_ROLES.ADMIN]: "/admin",
  [AUTH_ROLES.ORGANIZATION]: "/dashboard/organization",
  [AUTH_ROLES.STUDENT]: "/dashboard/student",
  [AUTH_ROLES.INSTRUCTOR]: "/dashboard/instructor",
  [AUTH_ROLES.PARENT]: "/dashboard/parent",
};

export default function LoginForm({ t }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const selectedRole = useSelector((state) => state.ui.selectedRole);
  const { loading, error } = useSelector((state) => state.auth);

  useEffect(() => {
    if (error) {
      notifyError(error);
    }
  }, [error]);

  const [formState, setFormState] = useState({
    email: "",
    nationalId: "",
    password: "",
    rememberMe: true,
  });

  const onChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormState((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    dispatch(setAuthRole(selectedRole));

    const payload = {
      role: selectedRole,
      password: formState.password,
    };

    payload.email = formState.email;

    const result = await dispatch(loginThunk(payload));

    if (loginThunk.fulfilled.match(result)) {
      navigate(rolePaths[selectedRole] || "/dashboard");
    }
  };

  const isParent = selectedRole === AUTH_ROLES.PARENT;

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className="space-y-2">
        <label className="px-1 text-xs font-bold uppercase tracking-widest text-slate-500">
          {t.login.email}
        </label>
        <input
          name="email"
          type="email"
          value={formState.email}
          onChange={onChange}
          required
          className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-cyan-500 focus:bg-white"
          placeholder={t.login.emailPlaceholder}
        />
      </div>

      <div className="space-y-2">
        <label className="px-1 text-xs font-bold uppercase tracking-widest text-slate-500">
          {t.login.password}
        </label>
        <input
          name="password"
          type="password"
          value={formState.password}
          onChange={onChange}
          required
          className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-cyan-500 focus:bg-white"
          placeholder="********"
        />
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            name="rememberMe"
            checked={formState.rememberMe}
            onChange={onChange}
            className="h-4 w-4 rounded border-slate-300 text-sky-700"
          />
          {t.login.rememberMe}
        </label>
        <button type="button" className="font-semibold text-sky-700">
          {t.login.forgotPassword}
        </button>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex h-12 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-sky-700 to-blue-500 font-bold text-white transition hover:opacity-95 disabled:opacity-60"
      >
        {loading ? t.login.signingIn : t.login.signIn}
      </button>
    </form>
  );
}
