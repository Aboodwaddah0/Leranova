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

  const [formState, setFormState] = useState({
    email: "",
    password: "",
    rememberMe: true,
  });

  const [loading, setLoading] = useState(false);
  const onChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormState((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const { data } = await api.post("/auth/admin/login", {
        email: formState.email,
        password: formState.password,
      });

      if (data?.data?.token) {
        dispatch(setAuthSession({
          token: data.data.token,
          user: data.data.user,
          role: AUTH_ROLES.ADMIN,
        }));

        if (formState.rememberMe) {
          localStorage.setItem("rememberEmail", formState.email);
        }

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
          placeholder="••••••••"
        />
      </div>

      <div className="flex items-center gap-2 text-sm text-slate-500">
        <input
          type="checkbox"
          id="rememberMe"
          name="rememberMe"
          checked={formState.rememberMe}
          onChange={onChange}
          className="h-4 w-4 rounded border-slate-300"
        />
        <label htmlFor="rememberMe" className="cursor-pointer">
          {t.login.rememberMe}
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="h-12 w-full rounded-2xl bg-gradient-to-r from-sky-700 to-blue-600 font-bold text-white shadow-lg transition hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? t.login.signingIn : t.login.signIn}
      </button>
    </form>
  );
}
