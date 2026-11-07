import DreamVault from "@/components/DreamVault";

export default function Home() {
  return (
    <>
      <a href="#planner" className="skip-link">
        Skip to the planner
      </a>

      <header className="site-header">
        <div className="container site-header__inner">
          <p className="brand">
            <span className="brand__mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
                <path d="M12 2.5 20.5 8 12 21.5 3.5 8 12 2.5Z" />
                <path d="M3.5 8h17M12 2.5 8.5 8 12 21.5 15.5 8 12 2.5Z" />
              </svg>
            </span>
            Dream Vault
          </p>
        </div>
      </header>

      <main id="planner" tabIndex={-1}>
        <section className="hero container" aria-labelledby="hero-title">
          <p className="hero__eyebrow">Private savings planner</p>
          <h1 id="hero-title" className="hero__title">
            Every dream has a date.
            <span className="hero__title-accent"> Find yours.</span>
          </h1>
          <p className="hero__lead">
            Pick what you&rsquo;re saving for, add your numbers, and see how long it could take to get there,
            along with the milestones on the way.
          </p>
        </section>

        <div className="container">
          <DreamVault />
        </div>
      </main>

      <footer className="site-footer">
        <div className="container">
          <p>
            Estimates only. Dream Vault assumes a steady monthly contribution and constant growth, and isn&rsquo;t
            financial advice. Nothing you enter leaves your device.
          </p>
        </div>
      </footer>
    </>
  );
}
