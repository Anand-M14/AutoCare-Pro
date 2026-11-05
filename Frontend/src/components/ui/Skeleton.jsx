export default function Skeleton({ w = "100%", h = 14, style }) {
  return <span className="skel" style={{ display: "block", width: w, height: h, ...style }} aria-hidden="true" />;
}
