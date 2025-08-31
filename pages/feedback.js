// pages/feedback.js
import { useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import Script from "next/script";

export default function FeedbackPage() {
  // ----- UI state -----
  const [selectedAttempt, setSelectedAttempt] = useState(1);
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [accessCode, setAccessCode] = useState("");

  // ----- Call state & guards -----
  const [isStarting, setIsStarting] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const lastStartRef = useRef(0);

  // ----- Status message -----
  const [status, setStatus] = useState({ text: "", type: "" }); // "success" | "error" | ""

  // ----- Retell SDK ref -----
  const retellRef = useRef(null);

  // Personas
  const personas = useMemo(
    () => [
      {
        key: "dominance",
        title: "High Dominance",
        description:
          "Direct, results-focused, and competitive. May be defensive or pushback against feedback. Values efficiency and bottom-line impact.",
        badge: "D",
        gradClass: "persona-d",
        agentId: "agent_placeholder_d",
      },
      {
        key: "influence",
        title: "High Influence",
        description:
          "Enthusiastic, people-oriented, and optimistic. May take feedback personally or become emotional. Values relationships and recognition.",
        badge: "I",
        gradClass: "persona-i",
        agentId: "agent_b9c3042ecd4b4d5a7b64e7caee", // your working agent
      },
      {
        key: "steadiness",
        title: "High Steadiness",
        description:
          "Calm, supportive, and collaborative. May avoid confrontation or need reassurance. Values stability and team harmony.",
        badge: "S",
        gradClass: "persona-s",
        agentId: "agent_placeholder_s",
      },
      {
        key: "conscientiousness",
        title: "High Conscientiousness",
        description:
          "Analytical, detail-oriented, and systematic. May question feedback validity or need specific examples. Values accuracy and quality.",
        badge: "C",
        gradClass: "persona-c",
        agentId: "agent_placeholder_c",
      },
    ],
    []
  );

  // Form validity
  const formValid = useMemo(() => {
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    return (
      !!selectedPersona &&
      name.trim() &&
      company.trim() &&
      email.trim() &&
      emailOk &&
      accessCode.trim()
    );
  }, [selectedPersona, name, company, email, accessCode]);

  function showStatus(text, type) {
    setStatus({ text, type });
  }
  function hideStatus() {
    setStatus({ text: "", type: "" });
  }

  // Initialize SDK once the UMD script has loaded
  function initRetell() {
    try {
      const RetellCtor =
        typeof window !== "undefined" &&
        (window.RetellWebClient ||
          (window.Retell && window.Retell.WebClient));

      if (!RetellCtor) {
        console.error("Retell SDK UMD not found on window.");
        showStatus("Failed to initialise voice client.", "error");
        return;
      }

      const client = new RetellCtor();
      retellRef.current = client;

      client.on("call_started", () => {
        console.log("Retell: call_started");
      });
      client.on("call_ended", () => {
        console.log("Retell: call_ended");
        setIsInCall(false);
      });
      client.on("error", (e) => {
        console.error("Retell error:", e);
        showStatus(e?.message || "Voice client error", "error");
      });

      console.log("Retell SDK initialised");
    } catch (e) {
      console.error("Failed to init Retell:", e);
      showStatus("Failed to initialise voice client.", "error");
    }
  }

  // Start call
  async function handleStart(e) {
    e.preventDefault();

    const now = Date.now();
    if (isEnding || isStarting || isInCall) return;
    if (now - lastStartRef.current < 1000) return; // throttle
    lastStartRef.current = now;

    if (!formValid) return;

    const persona = selectedPersona;
    if (!persona) {
      showStatus("Please select a personality type first.", "error");
      return;
    }
    if ((persona.agentId || "").includes("placeholder")) {
      showStatus(
        `${persona.title} personality is coming soon! Please try High Influence for now.`,
        "error"
      );
      return;
    }

    hideStatus();
    setIsStarting(true);

    try {
      const resp = await fetch("/api/create-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          company: company.trim(),
          email: email.trim(),
          accessCode: accessCode.trim(),
          persona: persona.key,
          agentId: persona.agentId,
          scenario: "feedback",
          attempt: selectedAttempt,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        console.error("API Error Response:", data);
        throw new Error(data?.detail || data?.message || "Failed to create call");
      }
      if (!data?.access_token) throw new Error("No access token received from server");

      const sdk = retellRef.current;
      if (!sdk?.startCall) throw new Error("Voice client not ready");

      await sdk.startCall({ accessToken: data.access_token });

      setIsInCall(true);
      showStatus("Connected! You can start speaking.", "success");
    } catch (err) {
      console.error("Error starting training:", err);
      showStatus(
        err?.message || "Failed to start training session. Please try again.",
        "error"
      );
      setIsInCall(false);
    } finally {
      setIsStarting(false);
    }
  }

  // End call
  async function handleEnd() {
    try {
      setIsEnding(true);
      await retellRef.current?.stopCall?.();
    } catch (e) {
      console.error("Error stopping call:", e);
    } finally {
      setIsInCall(false);
      showStatus("Training session completed!", "success");
      setTimeout(() => setIsEnding(false), 800);
      lastStartRef.current = Date.now();
    }
  }

  const titleForForm = selectedPersona
    ? `Training with ${selectedPersona.title} Employee`
    : "Ready to Start Your Training";

  return (
    <>
      <Head>
        <title>Feedback Training - CultureHub</title>
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>

      {/* Load UMD build AFTER interactive so build never touches it */}
      <Script
        src="https://cdn.jsdelivr.net/npm/retell-client-js-sdk@2/dist/umd/index.umd.js"
        strategy="afterInteractive"
        onLoad={initRetell}
        onError={() => showStatus("Failed to load voice client.", "error")}
      />

      {/* Floating colour swirls */}
      <div className="color-swirl swirl-1" />
      <div className="color-swirl swirl-2" />
      <div className="color-swirl swirl-3" />
      <div className="color-swirl swirl-4" />

      <div className="container">
        <header className="header">
          <div className="logo-container">
            <img src="/logo.png" alt="CultureHub" className="logo-image" />
          </div>
          <h1 className="main-title">Feedback Scenario Training</h1>
          <p className="subtitle">
            Practice giving constructive feedback using the SBI framework. Choose your
            conversation partner&apos;s personality type below.
          </p>
        </header>

        <main>
          {/* Persona grid */}
          <section className="personas-grid" id="personasGrid">
            {personas.map((p) => {
              const selected = selectedPersona?.key === p.key;
              return (
                <div
                  key={p.key}
                  className={`persona-card ${selected ? "selected" : ""}`}
                  onClick={() => {
                    setSelectedPersona(p);
                    hideStatus();
                  }}
                >
                  <div className="card-glow" />
                  <div className={`persona-icon ${p.gradClass}`}>{p.badge}</div>
                  <h3 className="persona-title">{p.title}</h3>
                  <p className="persona-description">{p.description}</p>
                  {selected && <div className="selection-indicator">✓</div>}
                </div>
              );
            })}
          </section>

          {/* Form */}
          <section className="form-section" id="participantForm">
            <div className="form-glow" />
            <h3 className="form-title">{titleForForm}</h3>

            <form
              onSubmit={handleStart}
              onKeyDown={(e) => {
                if ((isInCall || isEnding) && e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
            >
              <div className="attempt-selector">
                <label className="form-label">Training Attempt</label>
                <div className="attempt-buttons">
                  <button
                    type="button"
                    className={`attempt-button ${selectedAttempt === 1 ? "selected" : ""}`}
                    onClick={() => setSelectedAttempt(1)}
                  >
                    <span className="attempt-number">1</span>
                    <span className="attempt-text">Before Training</span>
                  </button>
                  <button
                    type="button"
                    className={`attempt-button ${selectedAttempt === 2 ? "selected" : ""}`}
                    onClick={() => setSelectedAttempt(2)}
                  >
                    <span className="attempt-number">2</span>
                    <span className="attempt-text">After Training</span>
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="participantName">
                  Your Name
                </label>
                <input
                  id="participantName"
                  type="text"
                  className="form-input"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="participantCompany">
                  Company
                </label>
                <input
                  id="participantCompany"
                  type="text"
                  className="form-input"
                  placeholder="Your company name"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="participantEmail">
                  Email Address
                </label>
                <input
                  id="participantEmail"
                  type="email"
                  className="form-input"
                  placeholder="your.email@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="accessCode">
                  Access Code
                </label>
                <input
                  id="accessCode"
                  type="text"
                  className="form-input"
                  placeholder="Enter your training access code"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  required
                />
              </div>

              {!isInCall ? (
                <button
                  type="submit"
                  className="start-button"
                  disabled={!formValid || isStarting || isEnding}
                  aria-disabled={!formValid || isStarting || isEnding}
                >
                  {isStarting ? "Connecting..." : "Start Voice Training Session"}
                  <span className="button-shine" />
                </button>
              ) : (
                <button
                  type="button"
                  className="start-button"
                  style={{ background: "linear-gradient(135deg, #dc2626, #b91c1c)" }}
                  onClick={handleEnd}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  End Training Session
                </button>
              )}
            </form>

            <div className={`loading ${isStarting ? "visible" : ""}`}>
              <div className="spinner" />
              <p>Connecting to your training session...</p>
            </div>

            {status.text ? (
              <div
                className={`status-message ${
                  status.type === "success" ? "status-success" : "status-error"
                }`}
              >
                {status.text}
              </div>
            ) : null}
          </section>

          {/* Footer */}
          <footer className="footer">
            <p className="copyright">© 2025 CultureHub Limited. All rights reserved.</p>
          </footer>
        </main>
      </div>

      {/* Global styles – unchanged beauty */}
      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Poppins', sans-serif;
          background: #000000;
          min-height: 100vh;
          color: white;
          overflow-x: hidden;
          position: relative;
          background-image:
            radial-gradient(circle at 20% 50%, rgba(120, 91, 246, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(78, 110, 243, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 40% 20%, rgba(248, 91, 246, 0.1) 0%, transparent 50%);
        }
        .color-swirl {
          position: fixed; border-radius: 50%; filter: blur(80px); opacity: 0.3;
          animation: float 25s infinite ease-in-out; pointer-events: none; z-index: 0; mix-blend-mode: screen;
        }
        .swirl-1 { width: 400px; height: 400px; background: linear-gradient(135deg, #02f5ec, #349fef); top: -10%; left: -10%; animation-delay: 0s; }
        .swirl-2 { width: 300px; height: 300px; background: linear-gradient(135deg, #349fef, #f95bf6); top: 60%; right: -5%; animation-delay: -7s; }
        .swirl-3 { width: 350px; height: 350px; background: linear-gradient(135deg, #02f5ec, #f95bf6); bottom: -10%; left: 30%; animation-delay: -14s; }
        .swirl-4 { width: 250px; height: 250px; background: linear-gradient(135deg, #fbbf24, #f59e0b); top: 30%; left: 50%; animation-delay: -21s; }
        @keyframes float { 0%,100%{transform:translate(0,0) scale(1) rotate(0)} 25%{transform:translate(30px,-30px) scale(1.1) rotate(90deg)} 50%{transform:translate(-20px,20px) scale(0.9) rotate(180deg)} 75%{transform:translate(40px,-10px) scale(1.05) rotate(270deg)} }
        .container { position: relative; z-index: 10; max-width: 1200px; margin: 0 auto; padding: 40px 20px; min-height: 100vh; }
        .header { text-align: center; margin-bottom: 60px; animation: fadeInDown 0.8s ease-out; }
        @keyframes fadeInDown { from{opacity:0; transform:translateY(-30px)} to{opacity:1; transform:translateY(0)} }
        .logo-container { display:flex; align-items:center; justify-content:center; margin-bottom:30px; }
        .logo-image { max-width:350px; height:auto; margin-bottom:20px; filter: drop-shadow(0 0 20px rgba(248, 91, 246, 0.3)); }
        .main-title { font-size:2.5rem; font-weight:600; margin-bottom:15px; color:white; text-shadow:0 2px 20px rgba(248, 91, 246, 0.3); }
        .subtitle { font-size:1.25rem; color:rgba(255,255,255,0.85); max-width:600px; margin:0 auto 50px; line-height:1.7; font-weight:300; }
        .personas-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:35px; margin-bottom:50px; animation: fadeInUp 0.8s ease-out; }
        @keyframes fadeInUp { from{opacity:0; transform:translateY(30px)} to{opacity:1; transform:translateY(0)} }
        .persona-card { background:linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05)); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.15); border-radius:24px; padding:35px; text-align:center; transition:all .4s cubic-bezier(.4,0,.2,1); cursor:pointer; position:relative; overflow:hidden; box-shadow:0 8px 32px rgba(0,0,0,.3); }
        .card-glow { position:absolute; top:50%; left:50%; width:150%; height:150%; background:radial-gradient(circle, rgba(248,91,246,.2), transparent 70%); transform:translate(-50%,-50%); opacity:0; transition:opacity .4s ease; pointer-events:none; }
        .persona-card:hover .card-glow { opacity:1; }
        .persona-card::before { content:""; position:absolute; top:0; left:-100%; width:100%; height:100%; background:linear-gradient(90deg, transparent, rgba(255,255,255,.15), transparent); transition:left .6s ease; }
        .persona-card:hover::before { left:100%; }
        .persona-card:hover { transform:translateY(-8px) scale(1.02); background:linear-gradient(135deg, rgba(255,255,255,.15), rgba(255,255,255,.08)); border-color:rgba(255,255,255,.25); box-shadow:0 12px 40px rgba(248,91,246,.2); }
        .persona-card.selected { background:linear-gradient(135deg, rgba(248,91,246,.25), rgba(198,34,240,.15)); border-color:#f95bf6; transform:scale(1.03); box-shadow:0 12px 40px rgba(248,91,246,.3); }
        .persona-icon { width:90px; height:90px; border-radius:50%; margin:0 auto 25px; display:flex; align-items:center; justify-content:center; font-size:2.5rem; font-weight:700; color:white; position:relative; box-shadow:0 8px 24px rgba(0,0,0,.3); transition:transform .3s ease; }
        .persona-card:hover .persona-icon { transform:scale(1.1) rotate(5deg); }
        .persona-d { background:linear-gradient(135deg, #dc2626, #b91c1c); box-shadow:0 8px 24px rgba(220,38,38,.4); }
        .persona-i { background:linear-gradient(135deg, #fbbf24, #f59e0b); box-shadow:0 8px 24px rgba(251,191,36,.4); }
        .persona-s { background:linear-gradient(135deg, #10b981, #059669); box-shadow:0 8px 24px rgba(16,185,129,.4); }
        .persona-c { background:linear-gradient(135deg, #3b82f6, #2563eb); box-shadow:0 8px 24px rgba(59,130,246,.4); }
        .persona-title { font-size:1.5rem; font-weight:600; margin-bottom:12px; letter-spacing:-.5px; }
        .persona-description { font-size:.95rem; color:rgba(255,255,255,.75); line-height:1.7; font-weight:300; }
        .selection-indicator { position:absolute; top:20px; right:20px; width:28px; height:28px; background:linear-gradient(135deg, #02f5ec, #f95bf6); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:16px; font-weight:bold; box-shadow:0 4px 12px rgba(248,91,246,.5); animation:pulse 2s infinite; }
        @keyframes pulse { 0%,100%{transform:scale(1); opacity:1} 50%{transform:scale(1.1); opacity:.9} }
        .form-section { background:linear-gradient(135deg, rgba(255,255,255,.08), rgba(255,255,255,.03)); backdrop-filter:blur(30px); border:1px solid rgba(255,255,255,.15); border-radius:28px; padding:45px; max-width:500px; margin:0 auto; transition:all .5s cubic-bezier(.4,0,.2,1); position:relative; overflow:hidden; box-shadow:0 20px 60px rgba(0,0,0,.4); }
        .form-glow { position:absolute; top:-50%; left:-50%; width:200%; height:200%; background:radial-gradient(circle, rgba(2,245,236,.1), transparent 40%); animation:rotate 20s linear infinite; pointer-events:none; }
        @keyframes rotate { from{transform:rotate(0)} to{transform:rotate(360deg)} }
        .form-title { font-size:1.9rem; font-weight:600; text-align:center; margin-bottom:35px; background:linear-gradient(135deg, #02f5ec, #349fef, #f95bf6); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
        .form-group { margin-bottom:28px; }
        .form-label { display:block; font-size:.95rem; font-weight:500; margin-bottom:10px; color:rgba(255,255,255,.95); letter-spacing:.5px; }
        .form-input { width:100%; padding:16px 20px; border:2px solid rgba(255,255,255,.15); border-radius:14px; background:rgba(255,255,255,.06); color:white; font-size:1rem; font-family:'Poppins', sans-serif; transition:all .3s ease; font-weight:400; }
        .form-input:focus { outline:none; border-color:#02f5ec; background:rgba(255,255,255,.1); box-shadow:0 0 0 4px rgba(2,245,236,.15); }
        .form-input::placeholder { color:rgba(255,255,255,.4); }
        .attempt-selector { margin-bottom:30px; }
        .attempt-buttons { display:flex; gap:15px; justify-content:center; }
        .attempt-button { flex:1; padding:15px 20px; border:2px solid rgba(255,255,255,.15); border-radius:12px; background:rgba(255,255,255,.05); color:white; cursor:pointer; transition:all .3s ease; font-family:'Poppins', sans-serif; font-size:.9rem; display:flex; flex-direction:column; align-items:center; gap:5px; }
        .attempt-number { font-size:1.5rem; font-weight:700; background:linear-gradient(135deg, #02f5ec, #349fef, #f95bf6); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
        .attempt-text { font-size:.85rem; color:rgba(255,255,255,.7); }
        .attempt-button:hover { background:rgba(255,255,255,.08); border-color:rgba(255,255,255,.25); transform:translateY(-2px); }
        .attempt-button.selected { background:linear-gradient(135deg, rgba(2,245,236,.2), rgba(249,91,246,.15)); border-color:#02f5ec; box-shadow:0 4px 20px rgba(2,245,236,.3); }
        .start-button { width:100%; padding:20px; background:linear-gradient(135deg, #02f5ec, #349fef, #f95bf6); border:none; border-radius:14px; color:white; font-size:1.15rem; font-weight:600; font-family:'Poppins', sans-serif; cursor:pointer; transition:all .3s ease; margin-top:15px; position:relative; overflow:hidden; box-shadow:0 8px 32px rgba(2,245,236,.4); text-transform:uppercase; letter-spacing:1px; }
        .button-shine { position:absolute; top:0; left:-100%; width:100%; height:100%; background:linear-gradient(90deg, transparent, rgba(255,255,255,.3), transparent); transition:left .5s ease; }
        .start-button:hover .button-shine { left:100%; }
        .start-button:hover { transform:translateY(-3px); box-shadow:0 12px 40px rgba(2,245,236,.5); }
        .start-button:disabled { background:rgba(255,255,255,.1); cursor:not-allowed; transform:none; box-shadow:none; text-transform:none; }
        .loading { text-align:center; padding:30px; display:none; }
        .loading.visible { display:block; }
        .spinner { border:3px solid rgba(255,255,255,.1); border-radius:50%; border-top:3px solid #02f5ec; width:50px; height:50px; animation:spin 1s linear infinite; margin:0 auto 20px; }
        @keyframes spin { 0%{transform:rotate(0)} 100%{transform:rotate(360deg)} }
        .status-message { text-align:center; padding:18px; border-radius:12px; margin-top:25px; font-weight:500; backdrop-filter:blur(10px); animation:fadeIn .3s ease; }
        @keyframes fadeIn { from{opacity:0; transform:scale(.95)} to{opacity:1; transform:scale(1)} }
        .status-error { background:linear-gradient(135deg, rgba(255,99,71,.2), rgba(220,38,38,.15)); border:1px solid rgba(255,99,71,.4); color:#ffcccb; }
        .status-success { background:linear-gradient(135deg, rgba(2,245,236,.2), rgba(16,185,129,.15)); border:1px solid rgba(2,245,236,.4); color:#02f5ec; }
        .footer { text-align:center; padding:40px 20px; margin-top:80px; border-top:1px solid rgba(255,255,255,.1); animation:fadeIn .8s ease-out; }
        .copyright { font-size:.9rem; color:rgba(255,255,255,.6); font-weight:300; letter-spacing:.5px; }
        @media (max-width: 768px) {
          .container { padding:20px 15px; }
          .main-title { font-size:2rem; }
          .personas-grid { grid-template-columns:1fr; gap:25px; }
          .form-section { padding:35px 25px; }
          .attempt-buttons { flex-direction:column; }
          .footer { margin-top:60px; }
        }
      `}</style>
    </>
  );
}
