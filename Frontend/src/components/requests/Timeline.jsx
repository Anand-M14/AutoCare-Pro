import { FLOW, flowIndex } from "../../lib/status";

/** Vertical journey of one request. Done steps are filled, the current step glows, the rest are dim. */
export default function Timeline({ status }) {
  if (status === "Rejected") return <p className="tl-rejected">This booking was rejected.</p>;
  const at = flowIndex(status);
  return (
    <ol className="tl" aria-label="Service progress">
      {FLOW.map(([key, label], i) => (
        <li key={key} className={i < at ? "done" : i === at ? "now" : ""} aria-current={i === at ? "step" : undefined}>
          <span>{label}</span>
        </li>
      ))}
    </ol>
  );
}
