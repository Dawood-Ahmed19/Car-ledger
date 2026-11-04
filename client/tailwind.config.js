/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        canvas: "#f8f9ff",
        ink: "#0b1c30",
        muted: "#434655",
        outline: "#c3c6d7",
        primary: { DEFAULT: "#2563eb", dark: "#004ac6" },
        tint: { 50: "#eff4ff", 100: "#e5eeff", 200: "#dce9ff", 300: "#dae2fd" },
        success: {
          DEFAULT: "#006242",
          bar: "#007d55",
          soft: "#6ffbbe",
          on: "#005236",
        },
        danger: { DEFAULT: "#ba1a1a", soft: "#ffdad6" },
      },
    },
  },
  plugins: [],
};
