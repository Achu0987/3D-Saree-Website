"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import SilkCanvas from "./SilkCanvas";
import { asset, formatPrice, imageCredits, isStaticSite, sarees, store, weaves } from "@/data/catalog";

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const FEATURED = "purple";

// shrink big phone photos before upload (faster, and the model only needs ~1.5k px)
async function preparePhoto(file) {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, 1536 / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scale);
  c.height = Math.round(img.height * scale);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return new Promise((r) => c.toBlob((b) => r(b), "image/jpeg", 0.92));
}

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

export default function Store() {
  const heroProgress = useRef(0);
  const heroRef = useRef(null);
  const ringRef = useRef(null);
  const ringSecRef = useRef(null);
  const lenisRef = useRef(null);
  const { bag, add, setQty } = useBag();
  const [bagOpen, setBagOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [active, setActive] = useState(0);
  const [weave, setWeave] = useState(weaves[0]);

  // try-on state
  const [photo, setPhoto] = useState(null); // { blob, url }
  const [pick, setPick] = useState(FEATURED);
  const [status, setStatus] = useState("idle"); // idle | working | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [split, setSplit] = useState(50);
  const [elapsed, setElapsed] = useState(0);
  const [tryOnReady, setTryOnReady] = useState(false);

  useEffect(() => {
    if (isStaticSite) return; // static hosting has no try-on server
    fetch("/api/try-on")
      .then((r) => r.json())
      .then((j) => setTryOnReady(Boolean(j.enabled)))
      .catch(() => {});
  }, []);

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

  const tryOn = (id) => {
    setPick(id);
    goTo("#tryon");
  };

  // ---------- scroll: smooth scrolling, hero progress, 3D ring ----------
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lenis = reduce ? null : new Lenis({ lerp: 0.085 });
    lenisRef.current = lenis;
    const cards = [...ringRef.current.querySelectorAll(".ring__card")];
    const n = cards.length;
    const step = 360 / n;
    let raf;
    let lastActive = -1;
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      lenis?.raf(now);
      const vh = window.innerHeight;

      const h = heroRef.current.getBoundingClientRect();
      heroProgress.current = clamp(-h.top / (h.height - vh));
      heroRef.current.style.setProperty("--p", heroProgress.current.toFixed(4));

      const r = ringSecRef.current.getBoundingClientRect();
      const rp = clamp(-r.top / (r.height - vh));
      const angle = -rp * step * (n - 1);
      ringRef.current.style.transform = `translateZ(calc(var(--radius) * -1)) rotateY(${angle}deg)`;
      cards.forEach((c, i) => {
        // how far this card is from facing the viewer (0 = front)
        let d = (((i * step + angle) % 360) + 540) % 360 - 180;
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
    };
    raf = requestAnimationFrame(tick);

    // reveal-on-scroll
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("is-in")),
      { threshold: 0.18 }
    );
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      lenis?.destroy();
    };
  }, []);

  // ---------- try-on ----------
  const onFile = async (file) => {
    if (!file || !file.type.startsWith("image/")) {
      setError("Please choose a photo (JPG or PNG).");
      return;
    }
    setError("");
    setResult(null);
    setStatus("idle");
    const blob = await preparePhoto(file);
    setPhoto((old) => {
      if (old?.url) URL.revokeObjectURL(old.url);
      return { blob, url: URL.createObjectURL(blob) };
    });
  };

  const drape = async () => {
    if (!photo) return setError("Upload a full-length photo first.");
    setStatus("working");
    setError("");
    setResult(null);
    const t0 = Date.now();
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - t0) / 1000)), 500);
    try {
      const fd = new FormData();
      fd.append("person", photo.blob, "me.jpg");
      fd.append("saree", pick);
      const res = await fetch("/api/try-on", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Something went wrong.");
      setResult(json.image);
      setSplit(50);
      setStatus("done");
    } catch (e) {
      setError(e.message);
      setStatus("error");
    } finally {
      clearInterval(timer);
      setElapsed(0);
    }
  };

  const featured = sarees.find((s) => s.id === FEATURED);
  const picked = sarees.find((s) => s.id === pick);

  return (
    <div className="store">
      {/* ===== header ===== */}
      <header className="nav">
        <a href="#" className="nav__logo" onClick={(e) => (e.preventDefault(), goTo("#top"))}>
          {store.name}
          <span>Handwoven sarees</span>
        </a>
        <nav className="nav__links">
          <a href="#collection" onClick={(e) => (e.preventDefault(), goTo("#collection"))}>Collection</a>
          <a href="#featured" onClick={(e) => (e.preventDefault(), goTo("#featured"))}>Saree of the week</a>
          <a href="#tryon" onClick={(e) => (e.preventDefault(), goTo("#tryon"))}>Virtual try-on</a>
          <a href="#craft" onClick={(e) => (e.preventDefault(), goTo("#craft"))}>Craft</a>
        </nav>
        <button type="button" className="nav__bag" onClick={() => setBagOpen(true)}>
          Bag <b>{count}</b>
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
            <p className="hero__sub">
              Kanjivaram, Banarasi, Paithani and more, woven by hand. Scroll to unfold the drape, then see any saree on you with virtual try-on.
            </p>
            <div className="hero__cta">
              <button type="button" className="btn btn--dark" onClick={() => goTo("#collection")}>Explore the collection</button>
              <button type="button" className="btn btn--line" onClick={() => goTo("#tryon")}>Try it on you</button>
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
              <span className="weaves__name">{weave.name}</span>
              </div>
            </div>
          </div>
          <div className="hero__meta">
            <span>13 handpicked weaves</span>
            <span>Free shipping across India</span>
            <span>Pure silk · Pure zari</span>
          </div>
          <div className="hero__scroll">Scroll</div>
        </div>
      </section>

      {/* ===== collection: 3D ring ===== */}
      <section className="ring-sec" id="collection" ref={ringSecRef}>
        <div className="ring-sec__sticky">
          <div className="ring-sec__head">
            <p className="eyebrow">The collection</p>
            <h2 className="h2">
              Turn the loom.
              <br />
              <em>Meet each weave.</em>
            </h2>
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
                      <button type="button" onClick={() => tryOn(s.id)}>Try on</button>
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
            <span className="ring-sec__bar"><i /></span>
          </div>
        </div>
      </section>

      {/* ===== saree of the week ===== */}
      <section className="feature" id="featured">
        <div className="feature__img reveal">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset(`/sarees/${featured.id}.webp`)} alt={featured.name} />
        </div>
        <div className="feature__copy reveal">
          <p className="eyebrow">Saree of the week</p>
          <h2 className="h2">{featured.name}</h2>
          <p className="feature__note">{featured.note}</p>
          <dl className="feature__specs">
            <div><dt>Weave</dt><dd>{featured.weave}</dd></div>
            <div><dt>From</dt><dd>{featured.region}</dd></div>
            <div><dt>Length</dt><dd>6.3 m with blouse piece</dd></div>
            <div><dt>Care</dt><dd>Dry clean only</dd></div>
          </dl>
          <div className="feature__colors">
            {featured.colors.map((c) => (
              <span key={c} style={{ background: c }} />
            ))}
          </div>
          <div className="feature__buy">
            <span className="feature__price">{formatPrice(featured.price)}</span>
            <button type="button" className="btn btn--dark" onClick={() => addToBag(featured.id)}>Add to bag</button>
            <button type="button" className="btn btn--line" onClick={() => tryOn(featured.id)}>See it on me</button>
          </div>
        </div>
      </section>

      {/* ===== virtual try-on ===== */}
      <section className="tryon" id="tryon">
        <div className="tryon__head reveal">
          <p className="eyebrow">Virtual drape studio</p>
          <h2 className="h2">
            See it on <em>you</em>,<br />before it ships.
          </h2>
          <p className="tryon__lead">Upload one full-length photo, choose a saree, and we drape that exact weave on you: same face, same pose, real pleats.</p>
        </div>

        <div className="tryon__grid">
          {/* 1. photo */}
          <div className="panel reveal">
            <span className="panel__step">01 · Your photo</span>
            <label
              className={`drop${photo ? " has-photo" : ""}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                onFile(e.dataTransfer.files?.[0]);
              }}
            >
              <input type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0])} />
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo.url} alt="Your uploaded photo" />
              ) : (
                <span className="drop__hint">
                  <b>Drop a full-length photo</b>
                  or click to upload
                  <small>Stand straight, facing the camera, head to toe in frame, good light.</small>
                </span>
              )}
            </label>
          </div>

          {/* 2. saree */}
          <div className="panel reveal">
            <span className="panel__step">02 · Choose a saree</span>
            <div className="picker">
              {sarees.map((s) => (
                <button key={s.id} type="button" className={`picker__item${pick === s.id ? " is-on" : ""}`} onClick={() => setPick(s.id)} title={s.name}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={asset(`/sarees/${s.id}.webp`)} alt={s.name} loading="lazy" />
                </button>
              ))}
            </div>
            <p className="picker__name">
              {picked.name} · <span>{formatPrice(picked.price)}</span>
            </p>
            <button type="button" className="btn btn--dark btn--block" disabled={status === "working" || !tryOnReady} onClick={drape}>
              {!tryOnReady ? "Launching soon" : status === "working" ? `Draping… ${elapsed}s` : "Drape it on me"}
            </button>
            {!tryOnReady && <p className="tryon__soon">Virtual try-on is being switched on. Check back very soon.</p>}
            {error && <p className="tryon__error">{error}</p>}
            <p className="tryon__privacy">Your photo is sent to our AI partner only to create this preview and is not stored by us.</p>
          </div>

          {/* 3. result */}
          <div className="panel panel--result reveal">
            <span className="panel__step">03 · Your drape</span>
            <div className={`result${status === "working" ? " is-working" : ""}`}>
              {result && photo ? (
                <div className="compare" style={{ "--split": `${split}%` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={result} alt={`You wearing the ${picked.name}`} />
                  <div className="compare__before">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.url} alt="Your original photo" />
                  </div>
                  <input type="range" min="0" max="100" value={split} onChange={(e) => setSplit(+e.target.value)} aria-label="Compare before and after" />
                  <span className="compare__tag compare__tag--l">Before</span>
                  <span className="compare__tag compare__tag--r">After</span>
                </div>
              ) : (
                <div className="result__empty">
                  {status === "working" ? (
                    <>
                      <span className="loom" />
                      <b>Weaving your drape</b>
                      <small>This usually takes 30 to 60 seconds.</small>
                    </>
                  ) : (
                    <>
                      <b>Your preview appears here</b>
                      <small>Drag the slider to compare before and after.</small>
                    </>
                  )}
                </div>
              )}
            </div>
            {result && (
              <div className="result__actions">
                <a className="btn btn--line" href={result} download={`harsha-${picked.id}-tryon.png`}>Download</a>
                <button type="button" className="btn btn--dark" onClick={() => addToBag(picked.id)}>Add this saree</button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ===== craft ===== */}
      <section className="craft" id="craft">
        <div className="craft__head reveal">
          <p className="eyebrow">The craft</p>
          <h2 className="h2">
            Every saree takes
            <br />
            <em>weeks, not minutes.</em>
          </h2>
        </div>
        <div className="craft__rows">
          {[
            { img: "loom-hangers", k: "01", t: "Chosen at the loom", d: "We buy directly from weaving clusters in Kanchipuram, Varanasi and Paithan, piece by piece." },
            { img: "zari-detail", k: "02", t: "Pure zari, real gold", d: "Silver thread, gilded in gold and woven into borders that last a lifetime." },
            { img: "silk-stack", k: "03", t: "Finished by hand", d: "Every saree is checked, steamed and folded by hand before it reaches you." },
          ].map((c, i) => (
            <article key={c.k} className={`craft__row reveal${i % 2 ? " is-flip" : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={asset(`/craft/${c.img}.webp`)} alt="" loading="lazy" />
              <div>
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
        <div className="foot__brand">
          <span className="foot__logo">{store.name}</span>
          <p>{store.tagline}</p>
          <a href={`mailto:${store.email}`}>{store.email}</a>
        </div>
        <div className="foot__credits">
          <b>Photography</b>
          <p>
            Saree photos from Unsplash:{" "}
            {sarees.map((s, i) => (
              <span key={s.id}>
                <a href={s.credit.url} target="_blank" rel="noreferrer">{s.credit.by}</a>
                {i < sarees.length - 1 ? ", " : ". "}
              </span>
            ))}
            Textures and craft:{" "}
            {imageCredits.map((c, i) => (
              <span key={c.url}>
                <a href={c.url} target="_blank" rel="noreferrer">{c.by}</a>
                {i < imageCredits.length - 1 ? ", " : "."}
              </span>
            ))}
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
