export default function TabsSection({ tabs, activeTab, onChange }) {
  return (
    <div className="flex flex-wrap gap-2 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200/70">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
            tab.id === activeTab
              ? "bg-[#2379c3] text-white shadow"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}