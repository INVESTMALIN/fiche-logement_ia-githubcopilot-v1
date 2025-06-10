export default function Button({
    children,
    onClick,
    type = "button",
    variant = "primary", // 'primary' | 'secondary' | 'ghost'
    size = "md",         // 'sm' | 'md' | 'lg'
    disabled = false,
    className = "",
  }) {
    const base = "rounded font-semibold focus:outline-none transition"
    const sizes = {
      sm: "px-3 py-1 text-sm",
      md: "px-4 py-2 text-base",
      lg: "px-5 py-3 text-lg",
    }
  
    const variants = {
      primary: "bg-primary text-white hover:bg-yellow-500",
      secondary: "bg-accent text-white hover:bg-accent/80",
      ghost: "bg-transparent text-text hover:bg-gray-100",
    }
  
    const disabledStyle = disabled ? "opacity-50 cursor-not-allowed" : ""
  
    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`${base} ${sizes[size]} ${variants[variant]} ${disabledStyle} ${className}`}
      >
        {children}
      </button>
    )
  }
  