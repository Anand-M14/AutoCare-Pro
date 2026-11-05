import Icon from "./Icon";
import { isBike } from "../../lib/format";

/** Registration-plate chip: the app's signature way of showing a vehicle. */
export default function Plate({ number, type, small = false }) {
  if (!number) return <span style={{ color: "var(--text-3)" }}>No plate</span>;
  return (
    <span className={`plate${small ? " sm" : ""}`} title={type || undefined}>
      <i><Icon name={isBike(type) ? "bike" : "car"} size={11} /></i>
      <b>{number}</b>
    </span>
  );
}
