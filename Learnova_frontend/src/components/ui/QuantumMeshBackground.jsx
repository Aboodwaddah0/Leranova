import meshSceneUrl from "../../assets/envato-quantum-mesh.htm?url";

export default function QuantumMeshBackground({ theme = "light" }) {
  const src = `${meshSceneUrl}${meshSceneUrl.includes("?") ? "&" : "?"}theme=${theme}`;

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      <iframe
        title="Quantum mesh background"
        src={src}
        className="h-full w-full border-0 opacity-35"
        tabIndex={-1}
      />
    </div>
  );
}
