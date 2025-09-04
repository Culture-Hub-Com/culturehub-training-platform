import Head from "next/head";
import { useEffect, useRef, useState, useMemo } from "react";

export default function Feedback() {
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
        });
        client.on("error", (e) => console.error("Retell SDK error:", e));

        retellRef.current = client;
        console.log("Retell SDK initialised");
      } catch (e) {
        console.error("Failed to initialise Retell SDK:", e);
      }
    })();

    return () => {
      mounted = false;
      retellRef.current = null;
    };
  }, []);

  // ——— UI State (+ consent + access validation) ———
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const [attempt, setAttempt] = useState(1);

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [consent, setConsent] = useState(false);

  // Access code validation state
  const [accessValid, setAccessValid] = useState(null); // null | true | false
  const [accessChecking, setAccessChecking] = useState(false);
  const [accessMsg, setAccessMsg] = useState(""); // small inline hint

  const [status, setStatus] = useState({ type: "", text: "" }); // 'success' | 'error' | ''
  const [isStarting, setIsStarting] = useState(false);
  const [isInCall, setIsInCall] = useState(false);

  const emailOK = useMemo(
    () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()),
    [email]
  );

  const canSubmit =
    !!selectedPersona &&
    !!selectedAgentId &&
    !!name.trim() &&
    !!company.trim() &&
    !!email.trim() &&
    emailOK &&
    !!accessCode.trim() &&
    consent &&
    accessValid === true &&   // must be validated and valid
    !isStarting &&
    !isInCall;

  const personaCards = [
    {
      key: "dominance",
      title: "High Dominance",
      letter: "D",
      iconClass: "persona-d",
      desc:
        "Direct, results-focused, and competitive. May be defensive or pushback against feedback. Values efficiency and bottom-line impact.",
      agentId: "agent_2521f34c59eb0bdc62975a8e1e",
    },
    {
      key: "influence",
      title: "High Influence",
      letter: "I",
      iconClass: "persona-i",
      desc:
        "Enthusiastic, people-oriented, and optimistic. May take feedback personally or become emotional. Values relationships and recognition.",
      agentId: "agent_b9c3042ecd4b4d5a7b64e7caee", // live agent
    },
    {
      key: "steadiness",
      title: "High Steadiness",
      letter: "S",
      iconClass: "persona-s",
      desc:
        "Calm, supportive, and collaborative. May avoid confrontation or need reassurance. Values stability and team harmony.",
      agentId: "agent_c92ec6e95cc1732c47363c535c",
    },
    {
      key: "conscientiousness",
      title: "High Conscientiousness",
      letter: "C",
      iconClass: "persona-c",
      desc:
        "Analytical, detail-oriented, and systematic. May question feedback validity or need specific examples. Values accuracy and quality.",
      agentId: "agent_5342ccfe9d30c7f0ce26d65a2f",
    },
  ];

  function showStatus(text, type) {
    setStatus({ text, type });
  }
  function hideStatus() {
    setStatus({ text: "", type: "" });
  }

  // ——— Auto-scroll to form when persona selected ———
  const formRef = useRef(null);
  function handlePersonaSelect(card) {
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
      setAccessChecking(true);
      setAccessMsg("");
      setAccessValid(null);
      const res = await fetch("/api/validate-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessCode: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Unable to validate code");
      if (data?.valid) {
        setAccessValid(true);
        setAccessMsg("Code verified ✓");
      } else {
        setAccessValid(false);
        setAccessMsg(data?.message || "Invalid or expired code");
      }
    } catch (err) {
      console.error("Access validate error:", err);
      setAccessValid(false);
      setAccessMsg(err.message || "Could not validate code");
    } finally {
      setAccessChecking(false);
    }
  }

  // Validate when the user leaves the field
  function onAccessBlur() {
    validateAccessCode(accessCode);
  }

  // If they keep typing after a validation, clear the state so they must re-check
  function onAccessChange(e) {
    const val = e.target.value;
    setAccessCode(val);
    setAccessValid(null);
    setAccessMsg("");
  }

  // ——— Start Voice Session ———
  async function onSubmit(e) {
    e.preventDefault();
    hideStatus();

    if (isStarting || isInCall) return;

    if (!selectedPersona || !selectedAgentId) {
      showStatus("Please select a personality type first.", "error");
      return;
    }
    if (String(selectedAgentId).includes("placeholder")) {
      const card = personaCards.find((c) => c.key === selectedPersona);
      showStatus(
        `${card?.title || "This"} personality is coming soon! Please try High Influence for now.`,
        "error"
      );
      return;
    }
    if (!retellRef.current) {
      showStatus("Retell SDK not initialised yet. Give it a moment, then try again.", "error");
      return;
    }
    if (!consent) {
      showStatus("Please confirm you consent to processing your data.", "error");
      return;
    }

    // Safety re-check: ensure code is valid right now
    if (accessValid !== true) {
      await validateAccessCode(accessCode);
      if (accessValid !== true) {
        showStatus(accessMsg || "Please enter a valid access code.", "error");
        return;
      }
    }

    setIsStarting(true);

    const payload = {
      name: name.trim(),
      company: company.trim(),
      email: email.trim(),
      accessCode: accessCode.trim(),
      persona: selectedPersona,
      agentId: selectedAgentId,
      scenario: "feedback",
      attempt,
    };

    try {
      const res = await fetch("/api/create-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.message || "Failed to create call");
      if (!data.access_token) throw new Error("No access token returned from server.");

      await retellRef.current.startCall({ accessToken: data.access_token });
      setIsInCall(true);
      setIsStarting(false);
      showStatus("Connected! You can start speaking.", "success");
    } catch (err) {
      console.error(err);
      setIsStarting(false);
      showStatus(err.message || "Failed to start training session. Please try again.", "error");
    }
  }

  // ——— End Voice Session ———
  async function endSession() {
    try {
      if (retellRef.current) {
        await retellRef.current.stopCall();
      }
    } catch (e) {
      console.error("Error stopping call:", e);
    } finally {
      setIsInCall(false);
      setIsStarting(false);
      showStatus("Training session completed!", "success");
    }
  }

  return (
    <>
      <Head>
        <title>Feedback Training - CultureHub</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>

      {/* Floating color swirls */}
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
            Practice giving constructive feedback using the SBI framework. Choose your conversation
            partner&apos;s personality type below.
          </p>
        </header>

        <main>
          {/* Persona Grid */}
          <section className="personas-grid" id="personasGrid">
            {personaCards.map((card) => {
              const selected = selectedPersona === card.key;
              return (
                <div
                  key={card.key}
                  className={`persona-card${selected ? " selected" : ""}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => handlePersonaSelect(card)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") handlePersonaSelect(card);
                  }}
                >
                  <div className="card-glow" />
                  <div className={`persona-icon ${card.iconClass}`}>{card.letter}</div>
                  <h3 className="persona-title">{card.title}</h3>
                  <p className="persona-description">{card.desc}</p>
                  {selected && <div className="selection-indicator">✓</div>}
                </div>
              );
            })}
          </section>

          {/* Form */}
          <section
            ref={formRef}
            className={`form-section ${selectedPersona ? "visible" : ""}`}
            id="participantForm"
          >
            <div className="form-glow" />
            <h3 className="form-title">
              {selectedPersona
                ? `Training with ${
                    personaCards.find((c) => c.key === selectedPersona)?.title
                  } Employee`
                : "Ready to Start Your Training"}
            </h3>

            {/* Hide form during call to avoid accidental submit */}
            <form id="trainingForm" onSubmit={onSubmit} style={{ display: isInCall ? "none" : "block" }}>
              <div className="attempt-selector">
                <label className="form-label">Training Attempt</label>
                <div className="attempt-buttons">
                  <div
                    className={`attempt-button ${attempt === 1 ? "selected" : ""}`}
                    onClick={() => setAttempt(1)}
                    role="button"
                    tabIndex={0}
                  >
                    <span className="attempt-number">1</span>
                    <span className="attempt-text">Before Training</span>
                  </div>
                  <div
                    className={`attempt-button ${attempt === 2 ? "selected" : ""}`}
                    onClick={() => setAttempt(2)}
                    role="button"
                    tabIndex={0}
                  >
                    <span className="attempt-number">2</span>
                    <span className="attempt-text">After Training</span>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="participantName">Your Name</label>
                <input
                  id="participantName"
                  className="form-input"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  type="text"
                />
              </div>

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
                <label className="form-label" htmlFor="participantEmail">Email Address</label>
                <input
                  id="participantEmail"
                  className="form-input"
                  placeholder="your.email@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  type="email"
                  style={
                    email && !emailOK
                      ? { borderColor: "#dc2626", boxShadow: "0 0 0 3px rgba(220, 38, 38, 0.2)" }
                      : undefined
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="accessCode">Access Code</label>
                <input
                  id="accessCode"
                  className="form-input"
                  placeholder="Enter your training access code"
                  value={accessCode}
                  onChange={onAccessChange}
                  onBlur={onAccessBlur}
                  required
                  type="text"
                />
                {/* small inline hint */}
                {accessChecking && (
                  <div className="inline-hint checking">Checking code…</div>
                )}
                {accessValid === true && !!accessMsg && (
                  <div className="inline-hint ok">{accessMsg}</div>
                )}
                {accessValid === false && !!accessMsg && (
                  <div className="inline-hint bad">{accessMsg}</div>
                )}
              </div>

              {/* Consent + gentle recording note */}
              <div className="form-group consent-row">
                <label className="consent-label">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  <span>
                    I consent to the processing of my data for the purpose of running this simulation
                    and sending me my report. I have read the{" "}
                    <a href="/privacy">Privacy Notice</a>.
                  </span>
                </label>

                <p className="privacy-note">
                  This call is <strong>recorded solely for training</strong> and to generate your
                  personalised report. A small internal team may review short snippets to improve the
                  learning experience. You can ask us to delete your data at any time:{" "}
                  <a href="mailto:simulations@culture-hub.com">simulations@culture-hub.com</a>.
                </p>
              </div>

              <button
                type="submit"
                className="start-button"
                id="startButton"
                disabled={!canSubmit}
              >
                {isStarting ? "Connecting…" : "Start Voice Training Session"}
                <span className="button-shine" />
              </button>
            </form>

            {/* Loading indicator */}
            <div className={`loading ${isStarting ? "visible" : ""}`} id="loadingIndicator">
              <div className="spinner"></div>
              <p>Connecting to your training session...</p>
            </div>

            {/* End call button */}
            {isInCall && (
              <button
                id="end-session-btn"
                type="button"
                className="start-button"
                style={{ background: "linear-gradient(135deg, #dc2626, #b91c1c)", marginTop: 20 }}
                onClick={endSession}
              >
                End Training Session
              </button>
            )}

            {/* Status */}
            {!!status.text && (
              <div
                id="statusMessage"
                className={`status-message ${status.type === "error" ? "status-error" : "status-success"}`}
                style={{ display: "block" }}
              >
                {status.text}
              </div>
            )}
          </section>

          {/* Footer */}
          <footer className="footer">
            <p className="copyright">© 2025 CultureHub Limited. All rights reserved.</p>
          </footer>
        </main>
      </div>

      {/* —— BEAUTY-ONLY CSS (unchanged; + tiny hints) —— */}
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

        /* Floating decorative swirls */
        .color-swirl {
          position: fixed;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.3;
          animation: float 25s infinite ease-in-out;
          pointer-events: none;
          z-index: 0;
          mix-blend-mode: screen;
        }
        .swirl-1 { width: 400px; height: 400px; background: linear-gradient(135deg, #02f5ec, #349fef); top: -10%; left: -10%; animation-delay: 0s; }
        .swirl-2 { width: 300px; height: 300px; background: linear-gradient(135deg, #349fef, #f95bf6); top: 60%; right: -5%; animation-delay: -7s; }
        .swirl-3 { width: 350px; height: 350px; background: linear-gradient(135deg, #02f5ec, #f95bf6); bottom: -10%; left: 30%; animation-delay: -14s; }
        .swirl-4 { width: 250px; height: 250px; background: linear-gradient(135deg, #fbbf24, #f59e0b); top: 30%; left: 50%; animation-delay: -21s; }

        @keyframes float {
          0%, 100% { transform: translate(0px, 0px) scale(1) rotate(0deg); }
          25% { transform: translate(30px, -30px) scale(1.1) rotate(90deg); }
          50% { transform: translate(-20px, 20px) scale(0.9) rotate(180deg); }
          75% { transform: translate(40px, -10px) scale(1.05) rotate(270deg); }
        }

        .container { position: relative; z-index: 10; max-width: 1200px; margin: 0 auto; padding: 40px 20px; min-height: 100vh; }
        .header { text-align: center; margin-bottom: 60px; animation: fadeInDown 0.8s ease-out; }
        @keyframes fadeInDown { from { opacity: 0; transform: translateY(-30px); } to { opacity: 1; transform: translateY(0); } }

        .logo-container { display: flex; align-items: center; justify-content: center; margin-bottom: 30px; }
        .logo-image { max-width: 350px; height: auto; margin-bottom: 20px; filter: drop-shadow(0 0 20px rgba(248, 91, 246, 0.3)); }

        .main-title { font-size: 2.5rem; font-weight: 600; margin-bottom: 15px; color: white; text-shadow: 0 2px 20px rgba(248, 91, 246, 0.3); }
        .subtitle  { font-size: 1.25rem; color: rgba(255, 255, 255, 0.85); max-width: 600px; margin: 0 auto 50px; line-height: 1.7; font-weight: 300; }

        .personas-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 35px; margin-bottom: 50px; animation: fadeInUp 0.8s ease-out; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }

        .persona-card {
          background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05));
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 24px;
          padding: 35px;
          text-align: center;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          position: relative;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }
        .card-glow {
          position: absolute; top: 50%; left: 50%; width: 150%; height: 150%;
          background: radial-gradient(circle, rgba(248, 91, 246, 0.2), transparent 70%);
          transform: translate(-50%, -50%);
          opacity: 0; transition: opacity 0.4s ease; pointer-events: none;
        }
        .persona-card:hover .card-glow { opacity: 1; }

        .persona-card::before {
          content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
          transition: left 0.6s ease;
        }
        .persona-card:hover::before { left: 100%; }
        .persona-card:hover { transform: translateY(-8px) scale(1.02); background: linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.08)); border-color: rgba(255,255,255,0.25); box-shadow: 0 12px 40px rgba(248, 91, 246, 0.2); }
        .persona-card.selected { background: linear-gradient(135deg, rgba(248,91,246,0.25), rgba(198,34,240,0.15)); border-color: #f95bf6; transform: scale(1.03); box-shadow: 0 12px 40px rgba(248, 91, 246, 0.3); }

        .persona-icon {
          width: 90px; height: 90px; border-radius: 50%; margin: 0 auto 25px; display: flex; align-items: center; justify-content: center;
          font-size: 2.5rem; font-weight: 700; color: white; position: relative; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3); transition: transform 0.3s ease;
        }
        .persona-card:hover .persona-icon { transform: scale(1.1) rotate(5deg); }

        .persona-d { background: linear-gradient(135deg, #dc2626, #b91c1c); box-shadow: 0 8px 24px rgba(220, 38, 38, 0.4); }
        .persona-i { background: linear-gradient(135deg, #fbbf24, #f59e0b); box-shadow: 0 8px 24px rgba(251, 191, 36, 0.4); }
        .persona-s { background: linear-gradient(135deg, #10b981, #059669); box-shadow: 0 8px 24px rgba(16, 185, 129, 0.4); }
        .persona-c { background: linear-gradient(135deg, #3b82f6, #2563eb); box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4); }

        .persona-title { font-size: 1.5rem; font-weight: 600; margin-bottom: 12px; letter-spacing: -0.5px; }
        .persona-description { font-size: 0.95rem; color: rgba(255, 255, 255, 0.75); line-height: 1.7; font-weight: 300; }

        .selection-indicator {
          position: absolute; top: 20px; right: 20px; width: 28px; height: 28px;
          background: linear-gradient(135deg, #02f5ec, #f95bf6);
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
          font-size: 16px; font-weight: bold; box-shadow: 0 4px 12px rgba(248, 91, 246, 0.5);
          animation: pulse 2s infinite;
        }
        @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.9; } }

        .form-section {
          background: linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03));
          backdrop-filter: blur(30px);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 28px;
          padding: 45px;
          max-width: 500px;
          margin: 0 auto;
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
          opacity: 0; transform: translateY(20px);
        }
        .form-section.visible { opacity: 1; transform: translateY(0); }

        .form-glow {
          position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
          background: radial-gradient(circle, rgba(2,245,236,0.1), transparent 40%);
          animation: rotate 20s linear infinite; pointer-events: none;
        }
        @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .form-title {
          font-size: 1.9rem; font-weight: 600; text-align: center; margin-bottom: 35px;
          background: linear-gradient(135deg, #02f5ec, #349fef, #f95bf6);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }

        .form-group { margin-bottom: 28px; }
        .form-label { display: block; font-size: 0.95rem; font-weight: 500; margin-bottom: 10px; color: rgba(255, 255, 255, 0.95); letter-spacing: 0.5px; }
        .form-input {
          width: 100%; padding: 16px 20px; border: 2px solid rgba(255, 255, 255, 0.15);
          border-radius: 14px; background: rgba(255, 255, 255, 0.06); color: white; font-size: 1rem;
          font-family: 'Poppins', sans-serif; transition: all 0.3s ease; font-weight: 400;
        }
        .form-input:focus { outline: none; border-color: #02f5ec; background: rgba(255,255,255,0.1); box-shadow: 0 0 0 4px rgba(2,245,236,0.15); }
        .form-input::placeholder { color: rgba(255,255,255,0.4); }

        /* inline hint below access code */
        .inline-hint { margin-top: 8px; font-size: 0.9rem; }
        .inline-hint.ok { color: #02f5ec; }
        .inline-hint.bad { color: #ffcccb; }
        .inline-hint.checking { color: rgba(255,255,255,0.7); }

        .attempt-selector { margin-bottom: 30px; }
        .attempt-buttons { display: flex; gap: 15px; justify-content: center; }
        .attempt-button {
          flex: 1; padding: 15px 20px; border: 2px solid rgba(255,255,255,0.15); border-radius: 12px;
          background: rgba(255,255,255,0.05); color: white; cursor: pointer; transition: all 0.3s ease;
          font-family: 'Poppins', sans-serif; font-size: 0.9rem; display: flex; flex-direction: column; align-items: center; gap: 5px;
        }
        .attempt-number {
          font-size: 1.5rem; font-weight: 700;
          background: linear-gradient(135deg, #02f5ec, #349fef, #f95bf6);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .attempt-text { font-size: 0.85rem; color: rgba(255,255,255,0.7); }
        .attempt-button:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.25); transform: translateY(-2px); }
        .attempt-button.selected { background: linear-gradient(135deg, rgba(2,245,236,0.2), rgba(249,91,246,0.15)); border-color: #02f5ec; box-shadow: 0 4px 20px rgba(2,245,236,0.3); }

        .consent-row { margin-top: 6px; }
        .consent-label {
          display: flex; gap: 12px; align-items: flex-start; font-size: 0.95rem; color: rgba(255,255,255,0.9);
        }
        .consent-label input[type="checkbox"] {
          margin-top: 3px; width: 18px; height: 18px; accent-color: #02f5ec;
        }
        .consent-label a {
          color: #02f5ec; text-decoration: underline; text-underline-offset: 3px;
        }

        .privacy-note {
          margin-top: 10px;
          font-size: 0.88rem;
          line-height: 1.55;
          color: rgba(255,255,255,0.75);
        }
        .privacy-note a { color: #02f5ec; }

        .start-button {
          width: 100%; padding: 20px;
          background: linear-gradient(135deg, #02f5ec, #349fef, #f95bf6);
          border: none; border-radius: 14px; color: white; font-size: 1.15rem; font-weight: 600;
          font-family: 'Poppins', sans-serif; cursor: pointer; transition: all 0.3s ease;
          margin-top: 15px; position: relative; overflow: hidden; box-shadow: 0 8px 32px rgba(2,245,236,0.4);
          text-transform: uppercase; letter-spacing: 1px;
          display: flex; align-items: center; justify-content: center; gap: 10px;
        }
        .button-shine {
          position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          transition: left 0.5s ease;
        }
        .start-button:hover { transform: translateY(-3px); box-shadow: 0 12px 40px rgba(2,245,236,0.5); }
        .start-button:hover .button-shine { left: 100%; }
        .start-button:disabled { background: rgba(255,255,255,0.1); cursor: not-allowed; transform: none; box-shadow: none; text-transform: none; }

        .loading { text-align: center; padding: 30px; display: none; }
        .loading.visible { display: block; }
        .spinner {
          border: 3px solid rgba(255,255,255,0.1); border-radius: 50%;
          border-top: 3px solid #02f5ec; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 0 auto 20px;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        .status-message { text-align: center; padding: 18px; border-radius: 12px; margin-top: 25px; font-weight: 500; backdrop-filter: blur(10px); animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .status-error   { background: linear-gradient(135deg, rgba(255,99,71,0.2), rgba(220,38,38,0.15)); border: 1px solid rgba(255,99,71,0.4); color: #ffcccb; }
        .status-success { background: linear-gradient(135deg, rgba(2,245,236,0.2), rgba(16,185,129,0.15)); border: 1px solid rgba(2,245,236,0.4); color: #02f5ec; }

        .footer { text-align: center; padding: 40px 20px; margin-top: 80px; border-top: 1px solid rgba(255,255,255,0.1); animation: fadeIn 0.8s ease-out; }
        .copyright { font-size: 0.9rem; color: rgba(255, 255, 255, 0.6); font-weight: 300; letter-spacing: 0.5px; }

        @media (max-width: 768px) {
          .container { padding: 20px 15px; }
          .main-title { font-size: 2rem; }
          .personas-grid { grid-template-columns: 1fr; gap: 25px; }
          .form-section { padding: 35px 25px; }
          .attempt-buttons { flex-direction: column; }
          .footer { margin-top: 60px; }
        }
      `}</style>
    </>
  );
}
