"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import { asset, formatPrice, sarees } from "@/data/catalog";

const LOOK_MS = 4200; // auto-play speed

// "The drape stage": our model framed in a temple arch, the room tinted to each saree's colour,
// the weave's name written large behind her, and a column of fabric swatches to choose from.
const DrapeStudio = forwardRef(function DrapeStudio({ onAdd }, ref) {
  const rootRef = useRef(null);
  const [look, setLook] = useState(0);
  const [prev, setPrev] = useState(-1);
  const [autoPlay, setAutoPlay] = useState(true);
  const [inView, setInView] = useState(false);
  const resume = useRef(null);

  const show = useCallback((i) => {
    setLook((cur) => {
      if (cur !== i) setPrev(cur);
      return (i + sarees.length) % sarees.length;
    });
  }, []);

  // a manual choice pauses auto-play for a while, then it carries on by itself
  const choose = useCallback(
    (i) => {
      show(i);
      setAutoPlay(false);
      clearTimeout(resume.current);
      resume.current = setTimeout(() => setAutoPlay(true), 12000);
    },
    [show]
  );

  useImperativeHandle(ref, () => ({ choose: (id) => choose(sarees.findIndex((s) => s.id === id)) }), [choose]);

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.35 });
    io.observe(rootRef.current);
    return () => {
      io.disconnect();
      clearTimeout(resume.current);
    };
  }, []);

  useEffect(() => {
    if (!autoPlay || !inView) return;
    const t = setTimeout(() => show(look + 1), LOOK_MS);
    return () => clearTimeout(t);
  }, [autoPlay, inView, look, show]);

  const s = sarees[look];
  const word = s.weave.split(" ")[0]; // "Kanjivaram", "Banarasi", "Paithani"…
  const running = autoPlay && inView;

  return (
    <section className="dstage" id="studio" ref={rootRef} style={{ "--tint": s.colors[0], "--accent": s.colors[1] }}>
      <div className="dstage__tint" aria-hidden />
      <div key={`w-${look}`} className="dstage__word" aria-hidden>
        {word}
      </div>

      {/* left: story of the current saree */}
      <div className="dstage__info">
        <p className="eyebrow reveal">Drape studio</p>
        <h2 className="dstage__title reveal">
          Wear it before
          <br />
          <em>you buy it.</em>
        </h2>
        <div key={`i-${look}`} className="dstage__detail">
          <span className="dstage__weave">
            {s.weave} · {s.region}
          </span>
          <b className="dstage__name">{s.name}</b>
          <p className="dstage__note">{s.note}</p>
          <div className="dstage__buy">
            <span className="dstage__price">{formatPrice(s.price)}</span>
            <button type="button" className="btn btn--dark" onClick={() => onAdd(s.id)}>Add to bag</button>
          </div>
        </div>
        <div className="dstage__nav">
          <button type="button" aria-label="Previous saree" onClick={() => choose(look - 1)}>←</button>
          <span>
            {String(look + 1).padStart(2, "0")} <i>/ {sarees.length}</i>
          </span>
          <button type="button" aria-label="Next saree" onClick={() => choose(look + 1)}>→</button>
          <button type="button" className="dstage__play" onClick={() => setAutoPlay((a) => !a)}>
            {autoPlay ? "Pause" : "Play"}
          </button>
        </div>
      </div>

      {/* centre: the model in a temple arch */}
      <div className="dstage__arch reveal">
        <div className="dstage__frame">
          {sarees.map((x, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={x.id}
              src={asset(`/model/${x.id}.webp`)}
              alt={i === look ? `Our model wearing the ${x.name}` : ""}
              loading={i < 2 ? "eager" : "lazy"}
              className={`look${i === look ? " is-on" : ""}${i === prev ? " is-prev" : ""}`}
            />
          ))}
          <span key={`s-${look}`} className="studio__sheen" aria-hidden />
        </div>
        <span className="dstage__plinth" aria-hidden />
      </div>

      {/* right: fabric swatches, the active one wears a progress ring while auto-playing */}
      <div className="dstage__swatches reveal" role="list">
        {sarees.map((x, i) => (
          <button key={x.id} type="button" role="listitem" className={`swatch${i === look ? " is-on" : ""}`} onClick={() => choose(i)} aria-label={x.name}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={asset(`/sarees/${x.id}.webp`)} alt="" loading="lazy" />
            {i === look && (
              <svg className="swatch__ring" viewBox="0 0 64 64" aria-hidden>
                <circle key={`${look}-${running}`} className={running ? "is-running" : ""} cx="32" cy="32" r="30" style={{ "--ms": `${LOOK_MS}ms` }} />
              </svg>
            )}
            <span className="swatch__tip">{x.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
});

export default DrapeStudio;
