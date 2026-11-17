interface ConnectLogoProps {
  variant?: 'hero' | 'compact';
  className?: string;
}

/**
 * Recriação vectorial fiel do logótipo Connect 2026 do banner oficial:
 * "C" amarelo solar em destaque, "onnect" com marcador de nós conectados e "2026".
 */
export function ConnectLogo({
  variant = 'compact',
  className,
}: ConnectLogoProps) {
  if (variant === 'hero') {
    return (
      <div
        className={`inline-flex items-center rounded-xl bg-primary px-5 py-3.5 shadow-sm ${className ?? ''}`}
      >
        <svg
          viewBox="0 0 360 116"
          className="h-16 w-auto sm:h-20"
          role="img"
          aria-label="Connect 2026"
        >
          {/* Arco geométrico "C" amarelo */}
          <path
            d="M 80 28 A 38 38 0 1 0 80 88"
            fill="none"
            stroke="#FFD400"
            strokeWidth="22"
            strokeLinecap="butt"
          />

          {/* Texto "onnect" */}
          <text
            x="102"
            y="72"
            fill="#FFFFFF"
            fontFamily="Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
            fontSize="54"
            fontWeight="800"
            letterSpacing="-1.5"
          >
            onnect
          </text>

          {/* Ícone de conexão acima do "t" */}
          <path
            d="M 272 24 L 284 18 L 296 24 L 308 13"
            fill="none"
            stroke="#FFD400"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="272" cy="24" r="3.6" fill="#FFD400" />
          <circle cx="284" cy="18" r="3.6" fill="#FFD400" />
          <circle cx="296" cy="24" r="3.6" fill="#FFD400" />
          <circle cx="308" cy="13" r="3.6" fill="#FFD400" />

          {/* Ano "2026" */}
          <text
            x="182"
            y="102"
            fill="#FFFFFF"
            fontFamily="Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
            fontSize="26"
            fontWeight="700"
            letterSpacing="2"
          >
            2026
          </text>
        </svg>
      </div>
    );
  }

  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ''}`}>
      <svg
        viewBox="0 0 40 40"
        className="size-8 shrink-0"
        aria-hidden="true"
      >
        <rect width="40" height="40" rx="8" fill="#0038D6" />
        <path
          d="M 23.5 12.5 A 9 9 0 1 0 23.5 27.5"
          fill="none"
          stroke="#FFD400"
          strokeWidth="5.2"
          strokeLinecap="butt"
        />
        <path
          d="M 25 11.5 L 28.5 9.5 L 32 11"
          fill="none"
          stroke="#FFD400"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="25" cy="11.5" r="1.4" fill="#FFD400" />
        <circle cx="28.5" cy="9.5" r="1.4" fill="#FFD400" />
        <circle cx="32" cy="11" r="1.4" fill="#FFD400" />
      </svg>
      <span className="text-sm font-bold tracking-tight text-foreground">
        Connect <span className="text-primary">2026</span>
      </span>
    </span>
  );
}
