import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const stats = [
  { value: "2,285", unit: "kWh/m²/yr", label: "Approx. annual GHI used in the project model" },
  { value: "1.1–4.5", unit: "m/s", label: "Typical onshore wind-speed range considered" },
  { value: "94.7–130", unit: "mm/yr", label: "Annual precipitation range used for sizing" },
  { value: "0.29–12.7", unit: "%", label: "Modeled soiling-loss range in the technical study" },
];

const modules = [
  {
    id: "solar",
    number: "01",
    title: "Solar generation",
    kicker: "PRIMARY ENERGY",
    color: "lime",
    text: "The inclined photovoltaic surface provides the system’s dependable daytime generation layer while simultaneously becoming the rain-catching surface.",
    bullets: ["Monocrystalline PV", "MPPT tracking", "Thermal + soiling monitoring"],
  },
  {
    id: "wind",
    number: "02",
    title: "Urban wind",
    kicker: "COMPLEMENTARY ENERGY",
    color: "blue",
    text: "A compact vertical-axis turbine captures low-speed, turbulent rooftop flows without needing a yaw mechanism.",
    bullets: ["Vertical-axis architecture", "Low cut-in target ≈ 1.5 m/s", "PMSG generator"],
  },
  {
    id: "water",
    number: "03",
    title: "Rainwater recovery",
    kicker: "HYDROLOGICAL LAYER",
    color: "cyan",
    text: "Rain runs across the PV apron into an integrated perimeter channel, then passes through first-flush diversion, filtration and storage.",
    bullets: ["1.0–1.5 mm first flush", "50 μm + carbon + sediment", "UV-C disinfection + storage"],
  },
  {
    id: "control",
    number: "04",
    title: "Edge intelligence",
    kicker: "CONTROL LAYER",
    color: "amber",
    text: "The controller continuously compares expected and measured solar performance, routes energy, manages water states and triggers condition-based cleaning.",
    bullets: ["Clear-sky comparison", "Dynamic resource routing", "Condition-based maintenance"],
  },
];

const flow = [
  ["SUN", "PV ARRAY", "MPPT / DC BUS", "HOME LOADS", "BATTERY"],
  ["RAIN", "PV APRON", "FIRST FLUSH", "FILTRATION", "STORAGE"],
  ["WIND", "VAWT", "PMSG", "RECTIFIER", "DC BUS"],
];

function Icon({ type }) {
  const common = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" };
  const paths = {
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"/></>,
    wind: <><path d="M3 8h10.5a2.5 2.5 0 1 0-2.5-2.5"/><path d="M3 12h15a3 3 0 1 1-3 3"/><path d="M3 16h7"/></>,
    water: <><path d="M12 2.8S5.5 10.1 5.5 14.2A6.5 6.5 0 0 0 18.5 14.2C18.5 10.1 12 2.8 12 2.8Z"/><path d="M9 15.5c.7.8 1.6 1.2 2.8 1.2"/></>,
    battery: <><rect x="4" y="6" width="16" height="12" rx="2"/><path d="M8 10h3v4H8zM15 10h1v4h-1zM20 10h1v4h-1z"/></>,
    cpu: <><rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3"/><path d="M10 10h4v4h-4z"/></>,
    droplet: <path d="M12 2.5S6 9.3 6 14a6 6 0 0 0 12 0c0-4.7-6-11.5-6-11.5Z"/>,
    arrow: <><path d="M4 12h16"/><path d="m14 6 6 6-6 6"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
  };
  return <svg {...common}>{paths[type]}</svg>;
}

function App() {
  const [active, setActive] = useState("solar");
  const [scrolled, setScrolled] = useState(false);
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const activeModule = modules.find((m) => m.id === active);

  const demoData = useMemo(() => {
    if (!demo) return { solar: 2.4, wind: 0.32, battery: 68, water: 62 };
    return { solar: 3.1, wind: 0.71, battery: 81, water: 74 };
  }, [demo]);

  return (
    <div className="app">
      <div className="grain" />
      <header className={`nav ${scrolled ? "nav-scrolled" : ""}`}>
        <a className="brand" href="#top" aria-label="SunWindRain home">
          <span className="brand-mark">
            <span className="leaf leaf-a" />
            <span className="leaf leaf-b" />
            <span className="drop" />
          </span>
          <span>
            <b>Sun</b><strong>Wind</strong><em>Rain</em>
          </span>
        </a>
        <nav>
          <a href="#system">System</a>
          <a href="#intelligence">Intelligence</a>
          <a href="#prototype">Prototype</a>
        </nav>
        <a className="nav-cta" href="#prototype">Explore the system <span>↗</span></a>
      </header>

      <main id="top">
        <section className="hero section-pad">
          <div className="hero-copy">
            <div className="eyebrow"><span className="pulse" /> UAE URBAN RESOURCE SYSTEM / 01</div>
            <h1>One system.<br/><span>Three resources.</span><br/>Smarter resilience.</h1>
            <p className="hero-lede">
              SunWindRain integrates <b>solar energy, urban wind and rainwater recovery</b>
              into one compact cyber-physical architecture — then uses real-time intelligence
              to decide how every available resource should be used.
            </p>
            <div className="hero-actions">
              <a href="#system" className="button button-dark">See how it works <span>↓</span></a>
              <a href="#research" className="text-link">Why this matters in the UAE <span>↗</span></a>
            </div>
            <div className="hero-micro">
              <span><i>01</i> GENERATE</span>
              <span><i>02</i> HARVEST</span>
              <span><i>03</i> OPTIMIZE</span>
            </div>
          </div>

          <div className="hero-visual">
            <div className="visual-topline"><span>PROTOTYPE / SWR-01</span><span>LIVE CONCEPT</span></div>
            <div className="image-frame">
              <img src="/sunwindrain-system.png" alt="SunWindRain integrated solar, wind and rainwater harvesting prototype" />
              <div className="scanline" />
              <div className="visual-tag tag-one"><span className="tag-dot" /> ENERGY + WATER</div>
              <div className="visual-tag tag-two">URBAN MICRO-GRID / 001</div>
              <div className="target target-a" />
              <div className="target target-b" />
            </div>
            <div className="visual-caption">
              <span>Integrated physical architecture</span>
              <span>PV surface doubles as rain catchment</span>
            </div>
          </div>
        </section>

        <section className="ticker">
          <div>☀ SOLAR</div><span>+</span><div>◒ WIND</div><span>+</span><div>◌ WATER</div><span>+</span><div>⌁ EDGE INTELLIGENCE</div>
        </section>

        <section id="research" className="problem section-pad">
          <div className="section-kicker">THE CONTEXT / 02</div>
          <div className="problem-grid">
            <div>
              <h2>The UAE has the resources.<br/><i>The challenge is coordinating them.</i></h2>
            </div>
            <div className="problem-copy">
              <p>
                In an arid, sun-dominant urban environment, the resource profile is asymmetric:
                solar is abundant and predictable, wind is localized and intermittent, while rain
                arrives in short, high-intensity events.
              </p>
              <p>
                SunWindRain is designed around that reality. Instead of installing isolated
                systems, it gives them a shared structure, shared sensing and a shared control layer.
              </p>
              <div className="stat-row">
                {stats.map((s) => (
                  <div className="stat" key={s.value}>
                    <strong>{s.value}<small>{s.unit}</small></strong>
                    <span>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="system" className="system-section">
          <div className="section-pad">
            <div className="section-kicker">THE ARCHITECTURE / 03</div>
            <div className="section-head">
              <div>
                <h2>One physical footprint.<br/><i>Four coordinated layers.</i></h2>
              </div>
              <p>The product is not a collection of components. The product is the coordination between them.</p>
            </div>

            <div className="module-layout">
              <div className="module-list">
                {modules.map((m) => (
                  <button className={`module ${active === m.id ? "active" : ""}`} onClick={() => setActive(m.id)} key={m.id}>
                    <span className={`module-icon ${m.color}`}><Icon type={m.id === "solar" ? "sun" : m.id === "wind" ? "wind" : m.id === "water" ? "water" : "cpu"} /></span>
                    <span className="module-meta"><small>{m.number} / {m.kicker}</small><b>{m.title}</b></span>
                    <span className="module-arrow">↗</span>
                  </button>
                ))}
              </div>

              <div className={`module-detail ${activeModule.color}`}>
                <div className="detail-number">{activeModule.number}</div>
                <div className="detail-icon"><Icon type={activeModule.id === "solar" ? "sun" : activeModule.id === "wind" ? "wind" : activeModule.id === "water" ? "water" : "cpu"} /></div>
                <div className="detail-kicker">{activeModule.kicker}</div>
                <h3>{activeModule.title}</h3>
                <p>{activeModule.text}</p>
                <div className="detail-bullets">
                  {activeModule.bullets.map((b) => <span key={b}><Icon type="check" /> {b}</span>)}
                </div>
                <div className="detail-line" />
                <span className="detail-note">INTERACTIVE MODULE / SELECT ANOTHER LAYER</span>
              </div>
            </div>
          </div>
        </section>

        <section className="flow-section section-pad">
          <div className="section-kicker">RESOURCE FLOW / 04</div>
          <div className="section-head">
            <h2>Three inputs.<br/><i>One intelligent bus.</i></h2>
            <p>Every resource follows a different path — but the control system makes the final routing decision.</p>
          </div>
          <div className="flows">
            {flow.map((row, ri) => (
              <div className="flow-row" key={ri}>
                <div className={`flow-source source-${ri}`}>
                  <Icon type={ri === 0 ? "sun" : ri === 1 ? "water" : "wind"} />
                  <span>{row[0]}</span>
                </div>
                {row.slice(1).map((item, i) => (
                  <React.Fragment key={item}>
                    <span className="flow-arrow">→</span>
                    <div className={`flow-node ${i === 1 ? "highlight" : ""}`}>{item}</div>
                  </React.Fragment>
                ))}
              </div>
            ))}
          </div>
        </section>

        <section id="intelligence" className="intelligence">
          <div className="section-pad">
            <div className="section-kicker">THE INTELLIGENCE / 05</div>
            <div className="int-grid">
              <div className="int-copy">
                <h2>It doesn't just<br/><i>generate.</i><br/>It decides.</h2>
                <p>
                  The edge controller turns environmental measurements into actions. It compares
                  expected PV output with measured output, tracks battery state, monitors water,
                  and routes resources according to system priorities.
                </p>
                <div className="logic-list">
                  <div><span>01</span><b>Sense</b><small>GHI · temperature · voltage · current · wind · water</small></div>
                  <div><span>02</span><b>Compare</b><small>Expected clear-sky performance vs measured PV output</small></div>
                  <div><span>03</span><b>Route</b><small>Load → battery → secondary loads → grid bypass</small></div>
                  <div><span>04</span><b>Act</b><small>First-flush diversion, filtration, storage and cleaning</small></div>
                </div>
              </div>

              <div className="control-card">
                <div className="card-header"><span><i className="live-dot"/> EDGE CONTROL</span><span>ESP32-S3 / STM32</span></div>
                <div className="dashboard">
                  <div className="dash-main">
                    <span>RENEWABLE INPUT</span>
                    <strong>{(demoData.solar + demoData.wind).toFixed(2)} <small>kW</small></strong>
                    <div className="spark"><span style={{height:"32%"}}/><span style={{height:"49%"}}/><span style={{height:"44%"}}/><span style={{height:"67%"}}/><span style={{height:"57%"}}/><span style={{height:"82%"}}/><span style={{height:"73%"}}/><span style={{height:"92%"}}/></div>
                  </div>
                  <div className="dash-grid">
                    <div><Icon type="sun"/><span>SOLAR</span><b>{demoData.solar} kW</b></div>
                    <div><Icon type="wind"/><span>WIND</span><b>{demoData.wind} kW</b></div>
                    <div><Icon type="battery"/><span>BATTERY</span><b>{demoData.battery}%</b></div>
                    <div><Icon type="water"/><span>WATER</span><b>{demoData.water}%</b></div>
                  </div>
                  <div className="decision">
                    <span>ACTIVE DECISION</span>
                    <b>{demo ? "SURPLUS → BATTERY / WATER" : "SOLAR → LOADS / BATTERY"}</b>
                    <small>System state updated in real time</small>
                  </div>
                  <button className="simulate" onClick={() => setDemo(!demo)}>
                    {demo ? "Reset simulation" : "Run system simulation"} <span>▶</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="soiling section-pad">
          <div className="soiling-visual">
            <div className="panel">
              <div className="panel-grid" />
              <div className="dust-layer" />
              <div className="spray s1"/><div className="spray s2"/><div className="spray s3"/>
              <div className="panel-readout"><span>SOILING INDEX</span><strong>15.2%</strong><small>THRESHOLD EXCEEDED</small></div>
            </div>
          </div>
          <div className="soiling-copy">
            <div className="section-kicker">CONDITION-BASED MAINTENANCE / 06</div>
            <h2>The panel tells<br/><i>you when it needs help.</i></h2>
            <p>
              Fixed cleaning schedules can clean too early or leave a panel underperforming.
              SunWindRain estimates the difference between theoretical clear-sky output and actual
              PV power to calculate a dynamic soiling index.
            </p>
            <div className="threshold">
              <div><span>SI</span><strong>&gt; 0.15</strong><small>cleaning trigger</small></div>
              <div><span>WATER</span><strong>&gt; 20%</strong><small>reserve required</small></div>
              <div><span>WIND</span><strong>&lt; 5 m/s</strong><small>safe wash condition</small></div>
            </div>
            <p className="small-note">When conditions are validated, stored rainwater can power a short automated panel wash — closing the loop between harvesting and maintenance.</p>
          </div>
        </section>

        <section id="prototype" className="prototype section-pad">
          <div className="section-kicker">FROM CONCEPT TO PROOF / 07</div>
          <div className="prototype-head">
            <h2>Build small.<br/><i>Prove the intelligence.</i></h2>
            <p>A scaled functional prototype can validate the core research without pretending to power an entire building.</p>
          </div>
          <div className="prototype-grid">
            {[
              ["100–200 W", "SOLAR MODULE", "Real-time conversion + efficiency tracking"],
              ["50–100 W", "HELICAL VAWT", "Low-speed wind harvesting + DC integration"],
              ["12 V / 24 Ah", "LiFePO₄ STORAGE", "Load buffering + state-of-charge tracking"],
              ["50 μm → UV-C", "WATER TREATMENT", "First flush + filtration + disinfection"],
              ["ESP32-S3 / STM32", "CONTROL UNIT", "Optimization + soiling detection + actuation"],
            ].map((x) => (
              <div className="proto-card" key={x[1]}>
                <strong>{x[0]}</strong><span>{x[1]}</span><p>{x[2]}</p><i>↗</i>
              </div>
            ))}
          </div>
        </section>

        <section className="closing">
          <div className="closing-glow" />
          <div className="section-pad closing-inner">
            <div className="section-kicker">THE BIG IDEA / 08</div>
            <h2>Not three systems.<br/><span>One coordinated resource loop.</span></h2>
            <p>
              SunWindRain turns an underused urban footprint into a responsive infrastructure layer —
              generating energy, recovering water and maintaining its own solar surface through data-driven control.
            </p>
            <a href="#top" className="button button-light">Back to the beginning ↑</a>
          </div>
        </section>
      </main>

      <footer>
        <div className="brand footer-brand"><span className="brand-mark"><span className="leaf leaf-a"/><span className="leaf leaf-b"/><span className="drop"/></span><span><b>Sun</b><strong>Wind</strong><em>Rain</em></span></div>
        <span>INTELLIGENT URBAN RESOURCE SYSTEM / 2026</span>
        <span>ENERGY + WATER + INTELLIGENCE</span>
      </footer>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
