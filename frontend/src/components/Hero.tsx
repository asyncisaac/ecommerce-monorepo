export default function Hero() {
  return (
    <section className="container-page py-12">
      <div className="rounded-2xl overflow-hidden" style={{ background: "radial-gradient(1200px 400px at 20% 0%, #f2f2f2 0%, #e8e8e8 45%, #dcdcdc 100%)" }}>
        <div className="px-8 py-16 md:px-16 md:py-24">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-black">Sublime</h1>
          <p className="mt-3 text-black/60 text-lg max-w-2xl">
            Uma experiência de compra clean, com foco em produto, imagens grandes e detalhes elegantes.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <a href="#destaques" className="inline-flex items-center justify-center rounded-full bg-black text-white px-5 py-2 text-sm hover:bg-black/90 transition">Ver destaques</a>
            <a href="#todos" className="inline-flex items-center justify-center rounded-full border border-black/15 text-black px-5 py-2 text-sm hover:bg-black/[.04] transition">Ver todos os produtos</a>
          </div>
        </div>
      </div>
    </section>
  );
}