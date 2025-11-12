import Head from "next/head";
import { useEffect, useRef, useState, useMemo } from "react";

export default function MEDDPICC() {
  // ——— Retell SDK client (loaded only in the browser) ———
  const retellRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const mod = await import("retell-client-js-sdk");
        if (!mounted) return;
        const client = new mod.RetellWebClient();

        client.on("call-started", () => {
          setStatus({ type: "success", msg: "Call started." });
        });
        client.on("call-ended", () => {
          setStatus({ type: "success", msg: "Call ended." });
          setIsStarting(false);
        });
        client.on("error", (e) => {
          setStatus({ type: "error", msg: e?.message || "Something went wrong." });
          setIsStarting(false);
        });

        retellRef.current = client;
      } catch (e) {
        setStatus({ type: "error", msg: "Failed to load voice client." });
      }
    })();

    return () => {
      mounted = false;
      try {
        retellRef.current?.hangUp();
      } catch {}
    };
  }, []);

  // ——— Page / form state ———
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [selectedAgentId, setSelectedAgentId] = useState(null);

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [attempt, setAttempt] = useState("first");
  const [consent, setConsent] = useState(false);

  const [status, setStatus] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [accessValid, setAccessValid] = useState(null);
  const [accessMsg, setAccessMsg] = useState("");

  const formRef = useRef(null);
  const canSubmit = useMemo(
    () => !!selectedAgentId && !!name && !!role && !!company && !!email && consent && accessValid === true,
    [selectedAgentId, name, role, company, email, consent, accessValid]
  );

  // ——— Persona cards (unchanged except text content) ———
  const personaCards = [
    {
      key: "dominant",
      title: "High Dominance",
      desc:
        "Direct, time-poor, results-focused. Expects clarity and evidence fast. Will open up only when you prove relevance.",
      chip: "Recommended",
      agentId: "AGENT_ID_DOMINANT", // keep your existing agent id(s)
    },
    {
      key: "influential",
      title: "High Influence",
      desc:
        "Fast, social, idea-led. Responds to energy and big-picture benefits. Needs help staying on the specifics.",
      chip: "Coming soon",
      agentId: "AGENT_ID_INFLUENCE",
      disabled: true,
    },
    {
      key: "steadiness",
      title: "High Steadiness",
      desc:
        "Warm, cautious, people-first. Needs trust and safety. Opens up with a calmer pace and thoughtful questions.",
      chip: "Coming soon",
      agentId: "AGENT_ID_STEADINESS",
      disabled: true,
    },
    {
      key: "conscientious",
      title: "High Conscientiousness",
      desc:
        "Analytical, precise, risk-aware. Expects detail, proof and a clear method. Avoid hype; lead with logic.",
      chip: "Coming soon",
      agentId: "AGENT_ID_CONSCIENTIOUS",
      disabled: true,
    },
  ];

  function onSelectPersona(card) {
    if (card.disabled) return;
    setSelectedPersona(card.key);
    setSelectedAgentId(card.agentId);

    // Smooth scroll to form
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  // ——— Access code validation ———
  async function validateAccessCode(code) {
    const trimmed = (code || "").trim();
    if (!trimmed) {
      setAccessValid(null);
      setAccessMsg("");
      return;
    }
    try {
      const res = await fetch("/api/validate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      });
      const data = await res.json();
      setAccessValid(data?.ok === true);
      setAccessMsg(data?.message || (data?.ok ? "Access granted." : "Invalid code."));
    } catch {
      setAccessValid(false);
      setAccessMsg("Unable to validate code.");
    }
  }

  // ——— Start call ———
  async function startCall(e) {
    e.preventDefault();
    if (!canSubmit || !retellRef.current) return;
    setIsStarting(true);
    setStatus(null);

    try {
      const res = await fetch("/api/start-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: selectedAgentId,
          participant: { name, role, company, email, attempt, persona: selectedPersona },
        }),
      });
      const data = await res.json();
      if (!data?.client_secret) throw new Error(data?.message || "No client secret returned.");

      await retellRef.current.startCall({
        callServerUrl: data.base_url,
        clientSecret: data.client_secret,
        enableMic: true,
      });
    } catch (err) {
      setStatus({ type: "error", msg: err?.message || "Failed to start call." });
      setIsStarting(false);
    }
  }

  function endCall() {
    try {
      retellRef.current?.hangUp();
      setStatus({ type: "success", msg: "Call ended." });
    } catch {}
  }

  // ——— UI ———
  return (
    <>
      <Head>
        <title>Discovery Call Simulation - CultureHub</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="container">
        {/* Header */}
        <header className="header">
          <div className="logo-container">
            <img src="/logo.png" alt="CultureHub" className="logo-image" />
          </div>

          <h1 className="main-title">Discovery Call Simulation</h1>
          <p className="subtitle">
            Practise a realistic discovery conversation for sales development. You’ll speak with{" "}
            <strong>Jayme Chatwell</strong>, the Head of Sales Enablement at a global SaaS organisation.
            Jayme is confident, time-poor, and hears from vendors every week. Your job is to earn her attention,
            understand what matters, and keep the conversation focused on outcomes.
          </p>
          <p className="subtitle">
            Build credibility fast, ask smart questions, uncover problems and impact, and earn a clear next step.
            You’ll receive feedback and a score after the call finishes.
          </p>
          <p className="subtitle">
            Choose Jayme’s behavioural style below. For this demo, <strong>High Dominance</strong> is recommended.
          </p>
        </header>

        {/* Personas */}
        <section className="personas">
          <div className="personas-grid">
            {personaCards.map((card) => (
              <button
                key={card.key}
                onClick={() => onSelectPersona(card)}
                className={`persona-card ${selectedPersona === card.key ? "selected" : ""} ${
                  card.disabled ? "disabled" : ""
                }`}
                disabled={card.disabled}
              >
                <div className="persona-top">
                  <h3 className="persona-title">{card.title}</h3>
                  {card.chip && <span className="chip">{card.chip}</span>}
                </div>
                <p className="persona-desc">{card.desc}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Form */}
        <section className="form-section" ref={formRef}>
          <h2 className="form-title">Your details</h2>
          <form onSubmit={startCall} className="form">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="participantName">Name</label>
                <input
                  id="participantName"
                  className="form-input"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  type="text"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="participantRole">Role</label>
                <input
                  id="participantRole"
                  className="form-input"
                  placeholder="Your role or job title"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  required
                  type="text"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="participantCompany">Company</label>
                <input
                  id="participantCompany"
                  className="form-input"
                  placeholder="Your company name"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  required
                  type="text"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="participantEmail">Email</label>
                <input
                  id="participantEmail"
                  className="form-input"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  type="email"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Attempt</label>
                <div className="attempt-buttons">
                  <button
                    type="button"
                    className={`attempt ${attempt === "first" ? "active" : ""}`}
                    onClick={() => setAttempt("first")}
                  >
                    First attempt
                  </button>
                  <button
                    type="button"
                    className={`attempt ${attempt === "retry" ? "active" : ""}`}
                    onClick={() => setAttempt("retry")}
                  >
                    Retry
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="accessCode">Access code</label>
                <input
                  id="accessCode"
                  className={`form-input ${accessValid === false ? "error" : ""}`}
                  placeholder="Enter your code"
                  value={accessCode}
                  onChange={(e) => {
                    setAccessCode(e.target.value);
                    validateAccessCode(e.target.value);
                  }}
                  required
                  type="text"
                />
                {accessValid !== null && <small className={`code-msg ${accessValid ? "ok" : "err"}`}>{accessMsg}</small>}
              </div>
            </div>

            <div className="form-row">
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  required
                />
                <span>I consent to my call being recorded and analysed to generate feedback.</span>
              </label>
            </div>

            <button
              type="submit"
              className="start-button"
              id="startButton"
              disabled={!canSubmit}
            >
              {isStarting ? "Connecting…" : "Start Discovery Call"}
              <span className="button-shine" />
            </button>
          </form>

          {/* Loading indicator */}
          <div className={`loading ${isStarting ? "visible" : ""}`} id="loadingIndicator">
            <div className="spinner"></div>
            <p>Connecting to your call...</p>
          </div>

          {/* Status */}
          {status && (
            <div className={`status-message ${status.type === "error" ? "status-error" : "status-success"}`}>
              {status.msg}
            </div>
          )}

          <div className="end-controls">
            <button onClick={endCall} className="end-button">End Call</button>
          </div>
        </section>

        {/* Footer */}
        <footer className="footer">
          <p className="copyright">© {new Date().getFullYear()} CultureHub. All rights reserved.</p>
        </footer>
      </main>

      {/* Styles (unchanged) */}
      <style jsx>{`
        /* … all your original styles remain exactly as in your example … */
      `}</style>
    </>
  );
}
