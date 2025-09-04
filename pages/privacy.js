// pages/privacy.js
import { useRouter } from "next/router";

export default function PrivacyPage() {
  const router = useRouter();
  const { from } = router.query;

  const routeMap = {
    feedback: "/feedback",
    meddpicc: "/meddpicc",
    coaching: "/coaching",
    negotiation: "/negotiation",
  };

  function handleBack(e) {
    e.preventDefault();
    if (from && routeMap[from]) {
      router.push(routeMap[from]);
      return;
    }
    if (typeof document !== "undefined" && document.referrer) {
      try {
        const ref = new URL(document.referrer);
        if (ref.origin === window.location.origin) {
          router.back();
          return;
        }
      } catch {}
    }
    router.push("/feedback");
  }

  return (
    <div style={styles.page}>
      <div style={{ ...styles.swirl, ...styles.swirl1 }} />
      <div style={{ ...styles.swirl, ...styles.swirl2 }} />
      <div style={{ ...styles.swirl, ...styles.swirl3 }} />

      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.title}>Privacy Notice</h1>
          <p style={styles.subtitle}>
            Your privacy matters to us. Here’s how we use and protect your data
            when you take part in our training simulations.
          </p>
        </header>

        <main style={styles.content}>
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>What data we collect</h2>
            <p style={styles.paragraph}>
              We collect your name, company, email address, attempt number, and
              training responses. This allows us to provide you with a
              personalised training experience and generate a tailored feedback
              report.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>How we use your data</h2>
            <p style={styles.paragraph}>
              Your data is used solely for training purposes: to set up your
              voice simulation, generate feedback reports, and share results
              with you via email. We do not sell or share your data with third
              parties outside of this process.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>How long we keep your data</h2>
            <p style={styles.paragraph}>
              Training records and reports are stored securely for 12 months,
              after which they are permanently deleted. You can request deletion
              earlier by contacting us.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Your rights</h2>
            <p style={styles.paragraph}>
              You have the right to access, correct, or delete your data at any
              time. Please contact us if you wish to exercise these rights.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Contact us</h2>
            <p style={styles.paragraph}>
              If you have any questions about this privacy notice or how your
              data is handled, please email us at{" "}
              <a
                href="mailto:simulations@culture-hub.com"
                style={{ color: "#24b9ee", textDecoration: "underline" }}
              >
                simulations@culture-hub.com
              </a>
              .
            </p>
          </section>
        </main>

        <div style={{ textAlign: "center", marginTop: "50px" }}>
          <button style={styles.backButton} onClick={handleBack}>
            ← Back to Training
          </button>
        </div>
      </div>
    </div>
  );
}

// --------------------
// Styles (unchanged)
// --------------------
const styles = {
  // ... (same as before, no edits needed)
};
