export default function RulesPage() {
  const rules = [
    "Do not overload the washing machine.",
    "Do not leave clothes unattended.",
    "Remove clothes immediately after the wash cycle is completed.",
    "Keep the washing area clean.",
    "Only liquid detergent is to be used. Washing powder of any kind is strictly prohibited.",
    "Do not remove the water pipe from the rear side. Doing so can damage the electrical component responsible for locking the machine lid.",
    "The washing area is under CCTV surveillance. Camera footage will be checked whenever misuse is suspected.",
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h2>Hostel Washing Rules</h2>
        <p>Please read and follow all rules for safe and fair use.</p>
      </div>

      <div className="card">
        <h3
          className="font-semibold"
          style={{ marginBottom: 8, color: "var(--primary)" }}
        >
          🧺 Rules & Guidelines
        </h3>
        <div>
          {rules.map((rule, i) => (
            <div key={i} className="rule-item">
              <div className="rule-num">{i + 1}</div>
              <p className="rule-text">
                {i === 4 ? (
                  <>
                    Only <strong>liquid detergent</strong> is to be used.
                    Washing powder of any kind is{" "}
                    <strong style={{ color: "var(--danger)" }}>
                      strictly prohibited
                    </strong>
                    .
                  </>
                ) : i === 5 ? (
                  <>
                    Do not remove the water pipe from the rear side. Doing so
                    can damage the <strong>electrical component</strong>{" "}
                    responsible for locking the machine lid.
                  </>
                ) : i === 6 ? (
                  <>
                    The washing area is under{" "}
                    <strong>CCTV surveillance</strong>. Camera footage will be
                    checked whenever misuse is suspected.
                  </>
                ) : (
                  rule
                )}
              </p>
            </div>
          ))}
        </div>

        <div className="penalty-box">
          <span className="icon">⚠️</span>
          <p>
            <strong>Penalty for Violation:</strong> Violations of these rules
            may result in penalties according to hostel management rules,
            including suspension of washing machine access and other
            disciplinary actions.
          </p>
        </div>
      </div>

      <div
        className="card"
        style={{
          marginTop: 16,
          background: "linear-gradient(135deg, #eff6ff, #dbeafe)",
          border: "1px solid #bfdbfe",
        }}
      >
        <h3
          className="font-semibold"
          style={{ marginBottom: 10, color: "#1e40af" }}
        >
          📅 Booking Rules
        </h3>
        <ul
          style={{
            paddingLeft: 20,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            fontSize: "0.875rem",
            color: "#1e3a8a",
          }}
        >
          <li>Maximum 1 booking per student per day.</li>
          <li>Booking window: today + next 2 days only.</li>
          <li>Same-day booking allowed if the slot is still available.</li>
          <li>Cancel at least 1 hour before your slot to free it.</li>
          <li>
            After cancellation, you may rebook another slot for the same day.
          </li>
          <li>Slots: 6 AM – 12 AM, 9 two-hour slots per day.</li>
        </ul>
      </div>
    </div>
  );
}
