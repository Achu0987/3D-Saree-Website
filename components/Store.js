"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import SilkCanvas from "./SilkCanvas";
import HangingSilk from "./HangingSilk";
import DrapeStudio from "./DrapeStudio";
import { asset, formatPrice, imageCredits, sarees, silkRoom, store, weaves } from "@/data/catalog";

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const FEATURED = "purple";
const MARQUEE = ["Kanjivaram", "Banarasi", "Paithani", "Tissue silk", "Organza", "Jamdani", "Soft silk", "Pure zari"];

function useBag() {
  const [bag, setBag] = useState([]);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("harsha-bag") || "[]");
      if (Array.isArray(saved)) setBag(saved);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("harsha-bag", JSON.stringify(bag));
    } catch {}
  }, [bag]);
  const add = (id) => setBag((b) => (b.find((x) => x.id === id) ? b.map((x) => (x.id === id ? { ...x, qty: x.qty + 1 } : x)) : [...b, { id, qty: 1 }]));
  const setQty = (id, qty) => setBag((b) => (qty <= 0 ? b.filter((x) => x.id !== id) : b.map((x) => (x.id === id ? { ...x, qty } : x))));
  return { bag, add, setQty };
}

// heading whose lines rise in one after another
function Split({ lines, as: Tag = "h2", className = "h2" }) {
  return (
    <Tag className={`${className} split reveal`}>
      {lines.map((l, i) => (
        <span key={i} className="split__line">
          <span style={{ "--i": i }}>{l}</span>
        </span>
      ))}
    </Tag>
  );
}

function Ornament() {
  return (
    <div className="ornament reveal" aria-hidden>
      <span />
      <i />
      <span />
    </div>
  );
}

export default function Store() {
  const heroProgress = useRef(0);
  const roomProgress = useRef(0);
  const heroRef = useRef(null);
  const ringRef = useRef(null);
  const ringSecRef = useRef(null);
  const roomRef = useRef(null);
  const studioApi = useRef(null);
  const lenisRef = useRef(null);
  const { bag, add, setQty } = useBag();
  const [bagOpen, setBagOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [active, setActive] = useState(0);
  const [weave, setWeave] = useState(weaves[0]);
  const [navHidden, setNavHidden] = useState(false);
  const [navSolid, setNavSolid] = useState(false);


  // silk room
  const [roomFocus, setRoomFocus] = useState(0);

  const count = bag.reduce((n, x) => n + x.qty, 0);
  const total = bag.reduce((n, x) => n + x.qty * (sarees.find((s) => s.id === x.id)?.price || 0), 0);

  const addToBag = (id) => {
    add(id);
    setToast(`${sarees.find((s) => s.id === id).name} added to your bag`);
    setTimeout(() => setToast(""), 2400);
  };

  const goTo = useCallback((sel) => {
    const el = document.querySelector(sel);
    if (!el) return;
    lenisRef.current ? lenisRef.current.scrollTo(el, { duration: 1.6 }) : el.scrollIntoView({ behavior: "smooth" });
  }, []);

  const seeOnModel = (id) => {
    studioApi.current?.choose(id);
    goTo("#studio");
  };

  // ---------- scroll: smooth scrolling, hero progress, 3D ring, silk room, nav, parallax ----------
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lenis = reduce ? null : new Lenis({ lerp: 0.085 });
    lenisRef.current = lenis;
    const cards = [...ringRef.current.querySelectorAll(".ring__card")];
    const parallax = [...document.querySelectorAll("[data-parallax]")];
    const n = cards.length;
    const step = 360 / n;
    let raf;
    let lastActive = -1;
    let lastY = window.scrollY;
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      lenis?.raf(now);
      const vh = window.innerHeight;
      const y = window.scrollY;

      // nav: tucks away while scrolling down, returns on the way up
      if (Math.abs(y - lastY) > 4) {
        setNavHidden(y > lastY && y > vh * 0.6);
        setNavSolid(y > 40);
        lastY = y;
      }

      const h = heroRef.current.getBoundingClientRect();
      heroProgress.current = clamp(-h.top / (h.height - vh));
      heroRef.current.style.setProperty("--p", heroProgress.current.toFixed(4));

      const r = ringSecRef.current.getBoundingClientRect();
      const rp = clamp(-r.top / (r.height - vh));
      const angle = -rp * step * (n - 1);
      ringRef.current.style.transform = `translateZ(calc(var(--radius) * -1)) rotateY(${angle}deg)`;
      cards.forEach((c, i) => {
        // how far this card is from facing the viewer (0 = front)
        const d = ((((i * step + angle) % 360) + 540) % 360) - 180;
        const f = 1 - Math.min(1, Math.abs(d) / 90);
        c.style.opacity = (0.15 + f * 0.85).toFixed(3);
        c.style.filter = `saturate(${0.4 + f * 0.6}) brightness(${0.75 + f * 0.25})`;
        c.style.pointerEvents = Math.abs(d) < step / 2 ? "auto" : "none";
      });
      const cur = Math.round(rp * (n - 1));
      if (cur !== lastActive) {
        lastActive = cur;
        setActive(cur);
      }
      ringSecRef.current.style.setProperty("--rp", rp.toFixed(4));

      const rr = roomRef.current.getBoundingClientRect();
      roomProgress.current = clamp(-rr.top / (rr.height - vh));
      roomRef.current.style.setProperty("--rp", roomProgress.current.toFixed(4));

      parallax.forEach((el) => {
        const b = el.parentElement.getBoundingClientRect();
        const off = (b.top + b.height / 2 - vh / 2) / vh;
        el.style.transform = `translate3d(0, ${(off * -60 * +el.dataset.parallax).toFixed(1)}px, 0) scale(1.12)`;
      });
    };
    raf = requestAnimationFrame(tick);

    // reveal-on-scroll
    const io = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("is-in")), {
      threshold: 0.16,
    });
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));


    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      lenis?.destroy();
    };
  }, []);

  const featured = sarees.find((s) => s.id === FEATURED);

  return (
    <div className="store">
      {/* ===== header ===== */}
      <header className={`nav${navHidden ? " is-hidden" : ""}${navSolid ? " is-solid" : ""}`}>
        <a href="#" className="nav__logo" onClick={(e) => (e.preventDefault(), goTo("#top"))}>
          {store.name}
          <span>Handwoven sarees</span>
        </a>
        <nav className="nav__links">
          <a href="#collection" onClick={(e) => (e.preventDefault(), goTo("#collection"))}>Collection</a>
          <a href="#studio" onClick={(e) => (e.preventDefault(), goTo("#studio"))}>Drape studio</a>
          <a href="#silkroom" onClick={(e) => (e.preventDefault(), goTo("#silkroom"))}>Silk room</a>
          <a href="#craft" onClick={(e) => (e.preventDefault(), goTo("#craft"))}>Craft</a>
        </nav>
        <button type="button" className="nav__bag" onClick={() => setBagOpen(true)}>
          Bag{" "}
          <b key={count} className="nav__count">
            {count}
          </b>
        </button>
      </header>

      {/* ===== hero: live 3D silk ===== */}
      <section className="hero" id="top" ref={heroRef}>
        <div className="hero__sticky">
          <div className="hero__silk">
            <SilkCanvas texture={weave.tex} progress={heroProgress} />
          </div>
          <div className="hero__copy">
            <p className="eyebrow">Handwoven in India · New season</p>
            <h1 className="hero__title">
              <span>Six yards</span>
              <span>
                <em>of light.</em>
              </span>
            </h1>
            <p className="hero__sub">Kanjivaram, Banarasi, Paithani and more, woven by hand. Scroll to unfold the drape, then watch every saree come alive on our model.</p>
            <div className="hero__cta">
              <button type="button" className="btn btn--dark" onClick={() => goTo("#collection")}>Explore the collection</button>
              <button type="button" className="btn btn--line" onClick={() => goTo("#studio")}>See it draped</button>
            </div>
            <div className="weaves">
              <span className="weaves__label">Choose the weave</span>
              <div className="weaves__row">
                <div className="weaves__dots">
                  {weaves.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      className={`weaves__dot${weave.id === w.id ? " is-on" : ""}`}
                      style={{ backgroundImage: `url(${w.tex})` }}
                      onClick={() => setWeave(w)}
                      aria-label={w.name}
                      title={w.name}
                    />
                  ))}
                </div>
                <span key={weave.id} className="weaves__name">{weave.name}</span>
              </div>
            </div>
          </div>
          <div className="hero__meta">
            <span>13 handpicked weaves</span>
            <span>Free shipping across India</span>
            <span>Pure silk · Pure zari</span>
          </div>
        </div>
      </section>

      {/* ===== moving band of weave names ===== */}
      <div className="marquee" aria-hidden>
        <div className="marquee__track">
          {[0, 1].map((k) => (
            <span key={k}>
              {MARQUEE.map((m) => (
                <span key={m} className="marquee__item">
                  {m}
                  <i>✦</i>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* ===== collection: 3D ring ===== */}
      <section className="ring-sec" id="collection" ref={ringSecRef}>
        <div className="ring-sec__sticky">
          <div className="ring-sec__head">
            <p className="eyebrow reveal">The collection</p>
            <Split lines={["Turn the loom.", <em key="e">Meet each weave.</em>]} />
          </div>
          <div className="ring-stage">
            <div className="ring" ref={ringRef} style={{ "--n": sarees.length }}>
              {sarees.map((s, i) => (
                <article key={s.id} className="ring__card" style={{ "--i": i }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={asset(`/sarees/${s.id}.webp`)} alt={s.name} loading={i < 4 ? "eager" : "lazy"} />
                  <div className="ring__info">
                    <span className="ring__weave">{s.weave}</span>
                    <h3>{s.name}</h3>
                    <span className="ring__price">{formatPrice(s.price)}</span>
                    <div className="ring__actions">
                      <button type="button" onClick={() => addToBag(s.id)}>Add to bag</button>
                      <button type="button" onClick={() => seeOnModel(s.id)}>On model</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
          <div className="ring-sec__foot">
            <span className="ring-sec__count">
              {String(active + 1).padStart(2, "0")} <i>/ {sarees.length}</i>
            </span>
            <span className="ring-sec__now">{sarees[active]?.region}</span>
            <span className="ring-sec__bar">
              <i />
            </span>
          </div>
        </div>
      </section>

      <Ornament />

      {/* ===== drape studio: our model in every saree ===== */}
      <DrapeStudio ref={studioApi} onAdd={addToBag} />

      <Ornament />

      {/* ===== silk room: hanging fabrics in 3D ===== */}
      <section className="silkroom" id="silkroom" ref={roomRef}>
        <div className="silkroom__sticky">
          <HangingSilk fabrics={silkRoom} progress={roomProgress} onFocus={setRoomFocus} />
          <div className="silkroom__head">
            <p className="eyebrow reveal">The silk room</p>
            <Split lines={["Walk past", <em key="e">the looms.</em>]} />
            <p className="silkroom__hint reveal">Scroll to stroll the row. Hover a fabric and it lifts in the breeze.</p>
          </div>
          <div className="silkroom__now">
            <span className="silkroom__idx">
              {String(roomFocus + 1).padStart(2, "0")} <i>/ {String(silkRoom.length).padStart(2, "0")}</i>
            </span>
            <b key={roomFocus}>{silkRoom[roomFocus].name}</b>
            <span className="silkroom__bar">
              <i />
            </span>
          </div>
        </div>
      </section>

      {/* ===== saree of the week ===== */}
      <section className="feature" id="featured">
        <div className="feature__img reveal reveal--img">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset(`/sarees/${featured.id}.webp`)} alt={featured.name} data-parallax="1" />
        </div>
        <div className="feature__copy">
          <p className="eyebrow reveal">Saree of the week</p>
          <Split lines={[featured.name]} />
          <p className="feature__note reveal">{featured.note}</p>
          <dl className="feature__specs reveal stagger">
            <div style={{ "--i": 0 }}><dt>Weave</dt><dd>{featured.weave}</dd></div>
            <div style={{ "--i": 1 }}><dt>From</dt><dd>{featured.region}</dd></div>
            <div style={{ "--i": 2 }}><dt>Length</dt><dd>6.3 m with blouse piece</dd></div>
            <div style={{ "--i": 3 }}><dt>Care</dt><dd>Dry clean only</dd></div>
          </dl>
          <div className="feature__colors reveal">
            {featured.colors.map((c) => (
              <span key={c} style={{ background: c }} />
            ))}
          </div>
          <div className="feature__buy reveal">
            <span className="feature__price">{formatPrice(featured.price)}</span>
            <button type="button" className="btn btn--dark" onClick={() => addToBag(featured.id)}>Add to bag</button>
            <button type="button" className="btn btn--line" onClick={() => seeOnModel(featured.id)}>See it on model</button>
          </div>
        </div>
      </section>

      <Ornament />

      {/* ===== craft ===== */}
      <section className="craft" id="craft">
        <div className="craft__head">
          <p className="eyebrow reveal">The craft</p>
          <Split lines={["Every saree takes", <em key="e">weeks, not minutes.</em>]} />
        </div>
        <div className="craft__rows">
          {[
            { img: "loom-hangers", k: "01", t: "Chosen at the loom", d: "We buy directly from weaving clusters in Kanchipuram, Varanasi and Paithan, piece by piece." },
            { img: "zari-detail", k: "02", t: "Pure zari, real gold", d: "Silver thread, gilded in gold and woven into borders that last a lifetime." },
            { img: "silk-stack", k: "03", t: "Finished by hand", d: "Every saree is checked, steamed and folded by hand before it reaches you." },
          ].map((c, i) => (
            <article key={c.k} className={`craft__row${i % 2 ? " is-flip" : ""}`}>
              <div className="craft__img reveal reveal--img">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={asset(`/craft/${c.img}.webp`)} alt="" loading="lazy" data-parallax="0.7" />
              </div>
              <div className="craft__text reveal">
                <span className="craft__k">{c.k}</span>
                <h3>{c.t}</h3>
                <p>{c.d}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ===== footer ===== */}
      <footer className="foot">
        <div className="foot__brand reveal">
          <span className="foot__logo">{store.name}</span>
          <p>{store.tagline}</p>
          <a href={`mailto:${store.email}`}>{store.email}</a>
        </div>
        <div className="foot__credits reveal">
          <b>Photography</b>
          <p>
            Saree photos from Unsplash:{" "}
            {sarees.map((s, i) => (
              <span key={s.id}>
                <a href={s.credit.url} target="_blank" rel="noreferrer">{s.credit.by}</a>
                {i < sarees.length - 1 ? ", " : ". "}
              </span>
            ))}
            Craft photos:{" "}
            {imageCredits.map((c, i) => (
              <span key={c.url}>
                <a href={c.url} target="_blank" rel="noreferrer">{c.by}</a>
                {i < imageCredits.length - 1 ? ", " : ". "}
              </span>
            ))}
            Model looks, hanging sarees and hero fabrics are AI-generated.
          </p>
        </div>
      </footer>

      {/* ===== bag drawer ===== */}
      <div className={`bag${bagOpen ? " is-open" : ""}`} onClick={() => setBagOpen(false)}>
        <aside className="bag__panel" onClick={(e) => e.stopPropagation()}>
          <div className="bag__head">
            <h3>Your bag</h3>
            <button type="button" onClick={() => setBagOpen(false)} aria-label="Close bag">✕</button>
          </div>
          {bag.length === 0 ? (
            <p className="bag__empty">Your bag is empty. Find a weave you love.</p>
          ) : (
            <ul className="bag__list">
              {bag.map((x) => {
                const s = sarees.find((y) => y.id === x.id);
                if (!s) return null;
                return (
                  <li key={x.id}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={asset(`/sarees/${s.id}.webp`)} alt="" />
                    <div>
                      <b>{s.name}</b>
                      <span>{formatPrice(s.price)}</span>
                      <div className="qty">
                        <button type="button" onClick={() => setQty(x.id, x.qty - 1)} aria-label="Less">−</button>
                        <span>{x.qty}</span>
                        <button type="button" onClick={() => setQty(x.id, x.qty + 1)} aria-label="More">+</button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="bag__foot">
            <div className="bag__total">
              <span>Subtotal</span>
              <b>{formatPrice(total)}</b>
            </div>
            <button type="button" className="btn btn--dark btn--block" disabled={!bag.length} onClick={() => setToast("Checkout isn't connected yet. Payments come next.")}>
              Checkout
            </button>
          </div>
        </aside>
      </div>

      <div className={`toast${toast ? " is-on" : ""}`} role="status">{toast}</div>
    </div>
  );
}
