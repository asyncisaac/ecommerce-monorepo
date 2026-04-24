export default function Hero() {
  return (
    <section className="container-page py-12">
      <div className="rounded-2xl overflow-hidden bg-[radial-gradient(1200px_400px_at_20%_0%,_#f2f2f2_0%,_#e8e8e8_45%,_#dcdcdc_100%)] dark:bg-[radial-gradient(1200px_400px_at_20%_0%,_#1a1a1a_0%,_#111111_45%,_#0a0a0a_100%)]">
        <div className="px-8 py-16 md:px-16 md:py-24">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-black dark:text-white">Loja</h1>
          <p className="mt-3 text-black/60 dark:text-white/70 text-lg max-w-2xl">
            Uma experiência de compra clean, com foco em produto, imagens grandes e detalhes elegantes.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <a href="#destaques" className="btn-primary text-sm">Ver destaques</a>
            <a href="/products" className="btn-secondary text-sm">Ver todos os produtos</a>
          </div>
        </div>
      </div>
    </section>
  );
}
