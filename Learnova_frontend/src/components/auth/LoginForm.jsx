import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { loginThunk } from "../../redux/thunks/authThunks";
import { setAuthRole } from "../../redux/slices/authSlice";
import { AUTH_ROLES } from "../../utils/constants";
import { notifyError } from "../../lib/notify";

const rolePaths = {
  [AUTH_ROLES.ADMIN]:        "/admin",
  [AUTH_ROLES.ORGANIZATION]: "/dashboard/organization",
  [AUTH_ROLES.STUDENT]:      "/dashboard/student",
  [AUTH_ROLES.INSTRUCTOR]:   "/dashboard/instructor",
  [AUTH_ROLES.PARENT]:       "/dashboard/parent",
};

export default function LoginForm({ t }) {
  const dispatch     = useDispatch();
  const navigate     = useNavigate();
  const selectedRole = useSelector((s) => s.ui.selectedRole);
  const { loading, error } = useSelector((s) => s.auth);

  useEffect(() => { if (error) notifyError(error); }, [error]);

  const [formState, setFormState] = useState({ email: "", password: "", rememberMe: true });

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormState((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    dispatch(setAuthRole(selectedRole));
    const result = await dispatch(loginThunk({ role: selectedRole, password: formState.password, email: formState.email }));
    if (loginThunk.fulfilled.match(result)) {
      const mustChangePassword =
        result.payload?.user?.mustChangePassword ||
        result.payload?.parent?.mustChangePassword ||
        false;
      if (mustChangePassword) {
        navigate("/change-password");
      } else {
        navigate(rolePaths[selectedRole] || "/dashboard");
      }
    }
  };

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div>
        <label className="auth-label">{t.login.email}</label>
        <input
          name="email" type="email" value={formState.email} onChange={onChange} required
          className="auth-input" placeholder={t.login.emailPlaceholder}
        />
      </div>

      <div>
        <label className="auth-label">{t.login.password}</label>
        <input
          name="password" type="password" value={formState.password} onChange={onChange} required
          className="auth-input" placeholder="••••••••"
        />
      </div>

      <div className="flex items-center justify-between text-sm">
        <label className="flex cursor-pointer items-center gap-2 text-slate-500">
          <input
            type="checkbox" name="rememberMe" checked={formState.rememberMe} onChange={onChange}
            className="h-4 w-4 rounded border-slate-300 accent-indigo-600"
          />
          {t.login.rememberMe}
        </label>
        <button type="button" className="font-semibold text-indigo-600 transition hover:text-indigo-700">
          {t.login.forgotPassword}
        </button>
      </div>

      <button type="submit" disabled={loading} className="auth-btn-primary">
        {loading ? t.login.signingIn : t.login.signIn}
      </button>
    </form>
  );
}
