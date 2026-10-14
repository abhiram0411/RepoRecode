import type { Preferences } from "../core/types";
export default function Avatar({
  prefs,
  companion = false,
  happy = false,
}: {
  prefs: Preferences;
  companion?: boolean;
  happy?: boolean;
}) {
  if (prefs.picture && !companion)
    return <img src={prefs.picture} alt="" className="profile-image" />;
  const robot = prefs.tutor === "robot",
    girl = prefs.tutor === "girl";
  const hair = prefs.hair ?? (girl ? "long" : "short");
  const outfit = prefs.outfit ?? (girl ? "hoodie" : "jacket");
  const body =
    prefs.skinColor ?? (robot ? "#bccbd0" : girl ? "#bc8462" : "#dca980");
  const hairColor = prefs.hairColor ?? (girl ? "#422b38" : "#30343e");
  const glasses = prefs.glasses ?? prefs.accessory === "glasses";
  const cap = prefs.cap ?? prefs.accessory === "cap";
  return (
    <svg
      viewBox="0 0 100 120"
      aria-hidden="true"
      className="character-art"
      data-character={prefs.tutor}
      data-outfit={outfit}
    >
      {!companion && (
        <rect
          width="100"
          height="120"
          rx="16"
          fill={prefs.background ?? "#26362b"}
        />
      )}
      <ellipse cx="50" cy="113" rx="28" ry="4" fill="#000000" opacity=".15" />
      <path
        d="M36 88v19m28-19v19"
        stroke={robot ? body : "#334355"}
        strokeWidth="12"
        strokeLinecap="round"
      />
      <path
        d="M29 108h14m14 0h14"
        stroke="#17232d"
        strokeWidth="8"
        strokeLinecap="round"
      />
      {!robot && hair === "long" && (
        <path
          d="M26 41Q19 14 50 12Q81 14 75 43L83 77 62 81 50 43 33 78 19 69Z"
          fill={hairColor}
        />
      )}
      {outfit === "hoodie" && (
        <path
          d="M27 69Q22 43 50 44Q79 44 73 69"
          fill={prefs.color}
          stroke="#000000"
          strokeOpacity=".18"
          strokeWidth="4"
        />
      )}
      <path
        d={
          outfit === "tee"
            ? "M32 58L20 69 29 78 34 72 33 93H67L66 72 71 78 80 69 68 58Z"
            : outfit === "hoodie"
              ? "M31 56Q50 50 69 56L72 94H28Z"
              : "M33 55L50 60 67 55 71 94H29Z"
        }
        fill={prefs.color}
      />
      {outfit === "jacket" && (
        <g stroke="#16272a" strokeWidth="2" fill="none">
          <path d="M50 60v34M33 56l9 16 8-12 8 12 9-16M34 79h9m14 0h9" />
        </g>
      )}
      {outfit === "hoodie" && (
        <g stroke="#16272a" strokeWidth="1.6" fill="none">
          <path d="M42 58v13m16-13v13M39 80h22l3 9H36Z" />
        </g>
      )}
      {outfit === "tee" && (
        <path
          d="M43 62q7 7 14 0"
          stroke="#16272a"
          strokeWidth="2"
          fill="none"
        />
      )}
      <g className="character-arm">
        <path
          d="M30 66L18 82"
          stroke={prefs.color}
          strokeWidth="12"
          strokeLinecap="round"
        />
        <circle cx="17" cy="85" r="6" fill={body} />
      </g>
      <path
        d="M70 66L82 82"
        stroke={prefs.color}
        strokeWidth="12"
        strokeLinecap="round"
      />
      <circle cx="83" cy="85" r="6" fill={body} />
      {robot ? (
        <>
          <rect x="25" y="18" width="50" height="40" rx="12" fill={body} />
          <path d="M50 18V9" stroke={body} strokeWidth="4" />
          <circle cx="50" cy="7" r="4" fill={prefs.color} />
          <rect x="31" y="27" width="38" height="22" rx="7" fill="#17252c" />
          <path
            d="M21 30v14m58-14v14"
            stroke={body}
            strokeWidth="5"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <path
            d={
              girl
                ? "M28 31Q29 13 50 14Q72 14 72 32V40Q69 57 50 61Q31 57 28 40Z"
                : "M27 31Q27 14 49 14Q72 14 73 31L70 48Q65 60 50 59Q35 60 29 48Z"
            }
            fill={body}
          />
          {hair !== "none" && (
            <path
              d={
                hair === "long"
                  ? "M25 38V24Q25 7 51 11Q79 11 76 37L65 24Q51 32 33 25L30 44Z"
                  : girl
                    ? "M26 31Q20 9 50 12Q80 11 75 35L58 24 45 31 35 25Z"
                    : "M25 33V21L34 17 32 10 48 14 54 7 65 16 75 20 74 32 59 24 40 27 31 37Z"
              }
              fill={hairColor}
            />
          )}
          {girl && (
            <path
              d="M32 43h5m26 0h5"
              stroke="#a85252"
              strokeWidth="3"
              strokeLinecap="round"
              opacity=".6"
            />
          )}
        </>
      )}
      <g
        fill="none"
        stroke={robot ? prefs.color : "#24252e"}
        strokeWidth="2.5"
        strokeLinecap="round"
      >
        <path d={happy ? "M36 37q4-6 8 0m12 0q4-6 8 0" : "M40 35v5m20-5v5"} />
        <path
          d={happy ? "M43 46q7 8 14 0" : girl ? "M45 47q5 4 10 0" : "M45 47h10"}
        />
      </g>
      {glasses && (
        <g
          data-accessory="glasses"
          stroke="#eaf4f7"
          strokeWidth="2"
          fill="none"
        >
          <rect x="31" y="31" width="17" height="13" rx="4" />
          <rect x="52" y="31" width="17" height="13" rx="4" />
          <path d="M48 36h4" />
        </g>
      )}
      {cap && (
        <path
          data-accessory="cap"
          d="M24 24Q26 6 49 8Q72 9 75 24H20L19 28H65"
          fill={prefs.color}
          stroke="#263947"
          strokeWidth="2"
        />
      )}
    </svg>
  );
}
