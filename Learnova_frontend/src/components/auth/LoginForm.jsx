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

const backendRoleToAuthRole = {
  STUDENT:  AUTH_ROLES.STUDENT,
  TEACHER:  AUTH_ROLES.INSTRUCTOR,
  PARENT:   AUTH_ROLES.PARENT,
  ADMIN:    AUTH_ROLES.ADMIN,
};

export default function LoginForm({ t, isArabic }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((s) => s.auth);

  useEffect(() => { if (error) notifyError(error); }, [error]);

  const [formState, setFormState] = useState({ identifier: "", password: "", rememberMe: true });

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormState((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(loginThunk({
      email: formState.identifier,
      password: formState.password,
    }));
    if (loginThunk.fulfilled.match(result)) {
      const payload = result.payload;

      // Org login response has an `organization` key; user login has `user`
      if (payload?.organization) {
        dispatch(setAuthRole(AUTH_ROLES.ORGANIZATION));
        navigate(rolePaths[AUTH_ROLES.ORGANIZATION]);
        return;
      }

      const user = payload?.user;
      const mustChange = user?.mustChangePassword || false;
      if (mustChange) {
        navigate("/change-password");
        return;
      }
      const authRole = backendRoleToAuthRole[user?.role] || AUTH_ROLES.STUDENT;
      dispatch(setAuthRole(authRole));
      navigate(rolePaths[authRole] || "/dashboard");
    }
  };

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div>
        <label className="auth-label">
          {isArabic ? "البريد الإلكتروني أو رقم القيد" : "Email or Registration Number"}
        </label>
        <input
          name="identifier"
          value={formState.identifier}
          onChange={onChange}
          required
          className="auth-input"
          placeholder={isArabic ? "أدخل البريد أو رقم القيد" : "Enter email or registration number"}
          autoComplete="username"
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
