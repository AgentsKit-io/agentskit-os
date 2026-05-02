export function TrustStrip() {
  const items = [
    { k: "12", v: "ADRs published" },
    { k: "6", v: "RFCs in review" },
    { k: "30+", v: "LLM adapters" },
    { k: ">90%", v: "Core test coverage" },
    { k: "MIT", v: "Open license" },
  ];
  return (
    <section className="border-y border-line py-10">
      <div className="container-x">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-y-6 gap-x-4">
          {items.map((i) => (
            <div key={i.v} className="text-center">
              <div className="text-2xl font-semibold tracking-tight">{i.k}</div>
              <div className="mt-1 text-[12px] uppercase tracking-widest text-ink-subtle">{i.v}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
