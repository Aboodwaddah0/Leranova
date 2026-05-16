import { useDispatch, useSelector } from "react-redux";
import { setSelectedRole } from "../../redux/slices/uiSlice";
import { setAuthRole, clearAuthError } from "../../redux/slices/authSlice";
import { AUTH_ROLES } from "../../utils/constants";

export default function RoleSelector({ t }) {
  const dispatch     = useDispatch();
  const selectedRole = useSelector((s) => s.ui.selectedRole);

  const options = [
    { value: AUTH_ROLES.STUDENT,      label: t.roles.student      },
    { value: AUTH_ROLES.PARENT,       label: t.roles.parent        },
    { value: AUTH_ROLES.INSTRUCTOR,   label: t.roles.instructor    },
    { value: AUTH_ROLES.ORGANIZATION, label: t.roles.organization  },
  ];

  const onChange = (role) => {
    dispatch(setSelectedRole(role));
    dispatch(setAuthRole(role));
    dispatch(clearAuthError());
  };

  return (
    <div>
      <label className="auth-label">{t.login.roleLabel}</label>
      <div className="grid grid-cols-2 gap-2">
        {options.map((opt) => {
          const active = selectedRole === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className="rounded-2xl border px-4 py-2.5 text-sm font-bold transition"
              style={active ? {
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                borderColor: "transparent",
                color: "#fff",
                boxShadow: "0 4px 14px rgba(99,102,241,.35)",
              } : {
                background: "#f8fafc",
                borderColor: "#e2e8f0",
                color: "#475569",
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
