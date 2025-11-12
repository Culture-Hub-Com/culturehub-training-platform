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
          console.log("Retell: call-started");
          setIsInCall(true);
          setIsStarting(false);
        });
        client.on("call-ended", () => {
          console.log("Retell: call-ended");
          setIsInCall(false);
          setIsStarting(false);
        });
        client.on("error", (e) => {
          console.error("Retell error:", e);
          setIsStarting(false);
        });

        retellRef.current = client;
      } catch (e) {
        console.error("Failed to init voice client:", e);
      }
    })();

    return () => {
      let mounted = false;
      try {
        retellRef.current?.hangUp();
      } catch {}
      retellRef.current = null;
    };
  }, []);

  // ——— UI State (+ consent + access validation) ———
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
  const [isInCall, setIsInCall] = useState(false);

  const [accessCode, setAccessCode] = useState("");
  const [accessValid, setAccessValid] = useState(null);
  const [accessMsg, setAccessMsg] = useState("");

  const formRef = useRef(null);
  const canSubmit = useMemo(
    () => !!selectedAgentId && !!name && !!role && !!company && !!email && consent && accessValid === true,
    [selectedAgentId, name, role, company, email, consent, accessValid]
  );

  const personaCards = [
    {
      key: "dominant",
      title: "High Dominance",
      letter: "D",
      iconClass: "persona-d",
      desc: "Direct, time-poor, results-focused. Expects clarity and evidence fast.",
      agentId: "agent_DOMINANCE_ID",
    },
    {
      key: "influence",
      title: "High Influence",
      letter: "I",
      iconClass: "persona-i",
      desc: "Enthusiastic, people-oriented, and optimistic.",
      agentId: "agent_2823aa0cca4d17dff83baedc0f",
    },
    {
      key: "steadiness",
      title: "High Steadiness",
      letter: "S",
      iconClass: "persona-s",
      desc: "Calm, supportive, and consistent.",
      agentId: "agent_6c93a3f0c9e640c5b58b0d417b3",
    },
    {
      key: "conscientious",
      title: "High Conscientiousness",
      letter: "C",
      iconClass: "persona-c",
      desc: "Analytical, precise, and risk-aware.",
      agentId: "agent_5b2c7c9c8f4a4f8fb7c6",
    },
  ];

  function onSelectPersona(card) {
    if (!card?.agentId) return;
    setSelectedPersona(card.key);
    setSelectedAgentId(card.agentId);

    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

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
      console.error("Start call error:", err);
      setStatus({ type: "error", msg: err?.message || "Failed to start call." });
      setIsStarting(false);
    }
  }

  function endCall() {
    try {
      retellRef.current?.hangUp();
      setStatus({ type: "success", msg: "Call ended." });
    } catch (e) {
      console.error("Error stopping call:", e);
    } finally {
      setIsInCall(false);
      setIsStarting(false);
    }
  }

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
            Practice a live discovery conversation with <strong>Jayme Chatwell</strong> — Head of Sales Enablement at a
            global SaaS organisation. You’re calling to understand her world, not pitch a product. Earn credibility fast,
            stay concise, and focus on what matters to the business.
          </p>

          <p className="subtitle">
            Your objectives: build credibility, ask smart questions, uncover problems and impact, and earn a clear next
            step. Choose a behavioural profile below — <strong>Dominance</strong>, <strong>Influence</strong>,{" "}
            <strong>Steadiness</strong>, or <strong>Conscientiousness</strong>. Each persona responds differently based on
            their style.
          </p>
        </header>

        {/* Persona selector */}
        <section className="personas">
          <div className="personas-grid">
            {personaCards.map((card) => (
              <button
                key={card.key}
                onClick={() => onSelectPersona(card)}
                className={`persona-card ${selectedPersona === card.key ? "selected" : ""}`}
              >
                <div className="persona-left">
                  <div className={`persona-icon ${card.iconClass}`}>{card.letter}</div>
                </div>
                <div className="persona-right">
                  <div className="persona-top">
                    <h3 className="persona-title">{card.title}</h3>
                  </div>
                  <p className="persona-desc">{card.desc}</p>
                </div>
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
                  placeholder="Enter your access code"
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

          <div className={`loading ${isStarting ? "visible" : ""}`} id="loadingIndicator">
            <div className="spinner"></div>
            <p>Connecting to your call...</p>
          </div>

          {status && (
            <div className={`status-message ${status.type === "error" ? "status-error" : "status-success"}`}>
              {status.msg}
            </div>
          )}

          <div className="end-controls">
            <button onClick={endCall} className="end-button">End Call</button>
          </div>
        </section>

        <footer className="footer">
          <p className="copyright">© {new Date().getFullYear()} CultureHub. All rights reserved.</p>
        </footer>
      </main>

      <style jsx>{`
        /* Your original styles remain unchanged */
      `}</style>
    </>
  );
}
