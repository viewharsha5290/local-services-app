export function AppLoading() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div
        style={{
          width: 28,
          height: 28,
          border: "2px solid var(--color-divider)",
          borderTopColor: "var(--color-accent)",
          animation: "spin 0.7s linear infinite",
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
