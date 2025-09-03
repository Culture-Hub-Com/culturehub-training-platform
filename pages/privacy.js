// pages/privacy.js
import Link from "next/link";

export default function Privacy() {
  return (
    <div className="privacy-page">
      {/* Floating swirls for consistency */}
      <div className="color-swirl swirl-1"></div>
      <div className="color-swirl swirl-2"></div>
      <div className="color-swirl swirl-3"></div>
      <div className="color-swirl swirl-4"></div>

      <div className="container">
        <header className="header">
          <div className="logo-container">
            <img src="/logo.png" alt="CultureHub" className="logo-image" />
          </div>
          <h1 className="main-title">Privacy Notice</h1>
          <p className="subtitle">
            How we collect, use, and protect your data during training
            simulations.
          </p>
        </header>

        <main>
          <section className="privacy-content glass-card">
            <h2>What we collect</h2>
            <p>
              Your name, company, email address, access code, selected DISC
              persona, attempt number, and the training conversation transcript.
            </p>

            <h2>Why we collect it</h2>
            <p>
              To personalise your simulation, generate a tailored feedback
              report, and measure learning impact across attempts.
            </p>

            <h2>How we use it</h2>
            <ul>
              <li>Run the live AI voice simulation</li>
              <li>Create your personalised feedback (scores + narrative)</li>
              <li>Email you a PDF report</li>
              <li>
                Analyse anonymised results to improve our programmes over time
              </li>
            </ul>

            <h2>Who sees it</h2>
            <p>
              Only CultureHub and our trusted processors: Airtable, Make.com,
              OpenAI (for analysis), and Google Docs/Drive (for report
              generation & delivery). We do not sell your data.
            </p>

            <h2>How long we keep it</h2>
            <p>Up to 12 months, unless you request deletion sooner.</p>

            <h2>Your rights</h2>
            <p>
              You can request a copy of your data or ask us to delete it at any
              time. Email{" "}
              <a href="mailto:privacy@culturehub.com">privacy@culturehub.com</a>
              .
            </p>
          </section>

          {/* Back button */}
          <div style={{ textAlign: "center", marginTop: "40px" }}>
            <Link href="/feedback">
              <button className="start-button">← Back to Training</button>
            </Link>
          </div>
        </main>

        <footer className="footer">
          <p className="copyright">
            © 2025 CultureHub Limited. All rights reserved.
          </p>
        </footer>
      </div>

      <style jsx>{`
        body,
        .privacy-page {
          background: #000;
          min-height: 100vh;
          font-family: "Poppins", sans-serif;
          color: white;
        }

        /* Swirls (same as feedback page) */
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
        .swirl-1 {
          width: 400px;
          height: 400px;
          background: linear-gradient(135deg, #02f5ec, #349fef);
          top: -10%;
          left: -10%;
        }
        .swirl-2 {
          width: 300px;
          height: 300px;
          background: linear-gradient(135deg, #349fef, #f95bf6);
          top: 60%;
          right: -5%;
        }
        .swirl-3 {
          width: 350px;
          height: 350px;
          background: linear-gradient(135deg, #02f5ec, #f95bf6);
          bottom: -10%;
          left: 30%;
        }
        .swirl-4 {
          width: 250px;
          height: 250px;
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          top: 30%;
          left: 50%;
        }

        @keyframes float {
          0%,
          100% {
            transform: translate(0px, 0px) scale(1) rotate(0deg);
          }
          50% {
            transform: translate(20px, -20px) scale(1.05) rotate(180deg);
          }
        }

        .container {
          position: relative;
          z-index: 10;
          max-width: 900px;
          margin: 0 auto;
          padding: 40px 20px;
        }

        .header {
          text-align: center;
          margin-bottom: 50px;
        }
        .logo-container {
          margin-bottom: 20px;
        }
        .logo-image {
          max-width: 250px;
        }
        .main-title {
          font-size: 2.4rem;
          font-weight: 600;
          margin-bottom: 15px;
          text-shadow: 0 2px 20px rgba(248, 91, 246, 0.3);
        }
        .subtitle {
          font-size: 1.1rem;
          color: rgba(255, 255, 255, 0.8);
        }

        .privacy-content {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.08),
            rgba(255, 255, 255, 0.03)
          );
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 24px;
          padding: 35px;
          line-height: 1.7;
        }
        .privacy-content h2 {
          margin-top: 30px;
          font-size: 1.4rem;
          background: linear-gradient(135deg, #02f5ec, #349fef, #f95bf6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .privacy-content a {
          color: #02f5ec;
        }
        .privacy-content ul {
          margin: 15px 0 15px 20px;
          list-style: disc;
        }

        .start-button {
          padding: 16px 26px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(135deg, #02f5ec, #349fef, #f95bf6);
          color: white;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 8px 26px rgba(2, 245, 236, 0.35);
        }
        .start-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 36px rgba(2, 245, 236, 0.5);
        }

        .footer {
          text-align: center;
          margin-top: 60px;
          padding: 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
}
