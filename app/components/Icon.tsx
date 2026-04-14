type IconName =
  | "cloud"
  | "home"
  | "search"
  | "boards"
  | "create"
  | "notifications"
  | "messages"
  | "settings"
  | "file"
  | "queue"
  | "mic"
  | "chevron-down"
  | "google"
  | "linkedin"
  | "apple";

type IconProps = {
  name: IconName;
  className?: string;
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
  title?: string;
};

export function Icon({
  name,
  className,
  stroke = "currentColor",
  fill = "none",
  strokeWidth = 1.8,
  title,
}: IconProps) {
  const common = {
    viewBox: "0 0 24 24",
    fill,
    stroke,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": title ? undefined : true,
  };

  switch (name) {
    case "cloud":
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <path d="M6.5 19C4.01 19 2 16.99 2 14.5c0-2.19 1.58-4.01 3.68-4.39A5.5 5.5 0 0 1 11 5.07V5a5 5 0 0 1 5 5h.5a3.5 3.5 0 1 1 0 7H13" />
          <path d="M12 12v7M9 16l3 3 3-3" />
        </svg>
      );
    case "home":
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
          <path d="M9 21V12h6v9" />
        </svg>
      );
    case "search":
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      );
    case "boards":
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case "create":
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      );
    case "notifications":
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      );
    case "messages":
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
    case "file":
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <path d="M7 3h7l3 3v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
          <path d="M10 11h5" />
          <path d="M10 15h5" />
        </svg>
      );
    case "queue":
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          {/* stacked layers — reading queue */}
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 12 12 17 22 12" />
          <polyline points="2 17 12 22 22 17" />
        </svg>
      );
    case "mic":
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <rect x="9" y="2" width="6" height="12" rx="3" />
          <path d="M5 10a7 7 0 0 0 14 0" />
          <path d="M12 19v3" />
          <path d="M9 22h6" />
        </svg>
      );
    case "chevron-down":
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <path d="m6 9 6 6 6-6" />
        </svg>
      );
    case "google":
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <path d="M21 12a9 9 0 1 1-2.65-6.35" />
          <path d="M21 12c0 5-3.8 9-9 9" />
          <path d="M21 12h-8.5" />
        </svg>
      );
    case "linkedin":
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <rect x="4" y="4" width="16" height="16" rx="3" />
          <rect x="7.5" y="10" width="2.2" height="6" />
          <circle cx="8.6" cy="7.6" r="1.1" />
          <path d="M12 10.2h2.1a2.8 2.8 0 0 1 2.8 2.8V16h-2.2v-2.7c0-1.1-.9-2-2-2H12z" />
        </svg>
      );
    case "apple":
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <path
            d="M15.2 8.4c1-1.1 1.6-2.6 1.4-4-1.4.1-3 .9-4 2-1 1.1-1.7 2.6-1.5 4 1.5.1 3-.8 4.1-2z"
            fill="currentColor"
            stroke="none"
          />
          <path
            d="M18.5 14.6c-.9 2.1-1.4 3-2.5 4.7-1.6 2.5-3.8 5.7-6.5 5.7-2.5 0-3-1.7-6-1.7-3 0-3.6 1.7-6.1 1.7-2.7 0-4.8-2.9-6.4-5.4-3.5-5.7-3.9-12.5-1.8-16 1.5-2.5 3.9-4 6.1-4 2.3 0 3.9 1.7 5.8 1.7 1.9 0 3-1.7 5.7-1.7 2 0 4 1.1 5.5 3.1-4.8 2.9-4 10.4.7 12.1z"
            fill="currentColor"
            stroke="none"
          />
        </svg>
      );
    default:
      return null;
  }
}
