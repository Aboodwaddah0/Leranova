import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import api from "../../utils/api";
import { AUTH_ROLES } from "../../utils/constants";
import { setAuthSession } from "../../redux/slices/authSlice";
import { notifyError } from "../../lib/notify";

export default function AdminLoginForm({ t }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [formState, setFormState] = useState({ email: "", password: "", rememberMe: true });
  const [loading, setLoading]     = useState(false);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormState((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/admin/login", { email: formState.email, password: formState.password });
      if (data?.data?.token) {
        dispatch(setAuthSession({ token: data.data.token, user: data.data.user, role: AUTH_ROLES.ADMIN }));
        if (formState.rememberMe) localStorage.setItem("rememberEmail", formState.email);
        navigate("/admin");
      }
    } catch (err) {
      notifyError(err.response?.data?.message || "Invalid credentials");
    } finally {
      setLoading(false);
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

      <div className="flex items-center gap-2 text-sm text-slate-500">
        <input
          type="checkbox" id="rememberMe" name="rememberMe"
          checked={formState.rememberMe} onChange={onChange}
          className="h-4 w-4 rounded border-slate-300 accent-indigo-600"
        />
        <label htmlFor="rememberMe" className="cursor-pointer">{t.login.rememberMe}</label>
      </div>

      <button type="submit" disabled={loading} className="auth-btn-primary">
        {loading ? t.login.signingIn : t.login.signIn}
      </button>
    </form>
  );
}
