export default function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  size = "md",
  disabled = false,
  className = "",
}) {
  const base = "rounded font-semibold focus:outline-none transition-all duration-200"
  const sizes = {
    sm: "px-3 py-1 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-5 py-3 text-lg",
  }

  const variants = {
    primary: "btn-primary hover:opacity-90 transform hover:scale-105",
    secondary: "btn-secondary", 
    ghost: "bg-transparent text-gray-700 hover:bg-gray-100",
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