export function VisionFlorals({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 280 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <g stroke="#a98c7d" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 292C26 280 43 259 55 239C64 228 73 219 80 214C97 193 108 168 121 150C130 137 139 119 146 106C159 85 169 70 180 48" />
        <path d="M80 214C105 223 131 218 152 207C175 199 192 190 205 186M121 150C105 145 89 128 82 113" />
        <g fill="#dce0cf" strokeWidth="1.1">
          <path d="M55 239C29 238 17 222 18 200C42 205 55 220 55 239Z" />
          <path d="M80 214C85 185 108 176 130 178C124 201 102 215 80 214Z" />
          <path d="M121 150C139 126 164 120 180 128C168 151 144 159 121 150Z" />
          <path d="M146 106C121 106 108 92 114 72C137 75 149 91 146 106Z" />
          <path d="M152 207C142 190 151 174 169 164C177 185 168 202 152 207Z" />
        </g>
        <g strokeWidth="0.75">
          <path d="M55 239Q33 218 18 200M80 214Q103 194 130 178M121 150Q150 135 180 128M146 106Q129 90 114 72M152 207Q158 184 169 164" />
        </g>
      </g>
      {[
        { transform: "translate(82 113) rotate(-18) scale(1.2)", fill: "#edc7bb" },
        { transform: "translate(180 48) rotate(14) scale(0.78)", fill: "#f4d9ca" },
        { transform: "translate(205 186) rotate(-5) scale(0.92)", fill: "#efcfc2" },
      ].map(({ transform, fill }) => (
        <g key={transform} transform={transform} stroke="#bc8a83" strokeWidth="1.1">
          {[0, 70, 143, 216, 287].map((angle) => (
            <path
              key={angle}
              transform={`rotate(${angle})`}
              d="M-3 3C-17-3-21-17-12-25C-4-33 10-30 13-20C18-8 8 1-3 3Z"
              fill={fill}
            />
          ))}
          <circle r="7" fill="#faeee8" />
          <circle cx="-2" cy="-1" r="1" fill="#bc8a83" stroke="none" />
          <circle cx="2" cy="2" r="1" fill="#bc8a83" stroke="none" />
          <circle cx="2" cy="-3" r="0.8" fill="#bc8a83" stroke="none" />
        </g>
      ))}
    </svg>
  );
}
