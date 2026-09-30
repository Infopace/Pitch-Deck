import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { User, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import {
  RocketIllustration,
  IdeateIcon,
  BuildIcon,
  ScaleIcon,
} from "@/components/auth/RocketIllustration";
import { MintLogo } from "@/components/brand/MintLogo";

/**
 * Register — balanced three-column composition on desktop, compact card-only on mobile.
 */
export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const [searchParams] = useSearchParams();
  const promptParam = searchParams.get("prompt");
  const formatParam = searchParams.get("format");

  const { register, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await register(name, email, password);
      if (promptParam) {
        navigate(
          `/dashboard?prompt=${encodeURIComponent(promptParam)}&format=${encodeURIComponent(
            formatParam || "pitch-deck"
          )}`
        );
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Registration failed");
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#f8faff] font-sans">
      {/* ==========================================================
          BACKGROUND DECORATION
      ========================================================== */}

      {/* Top-left soft circle */}
      <div className="pointer-events-none absolute -left-40 -top-48 h-[460px] w-[460px] rounded-full bg-gradient-to-br from-[#dce9ff] to-[#edf3ff] opacity-80" />

      {/* Top-right large blue circle */}
      <div className="pointer-events-none absolute -right-48 -top-56 h-[560px] w-[560px] rounded-full bg-gradient-to-br from-[#d9e6ff] via-[#c8d9ff] to-[#b9cbff] opacity-80" />

      {/* Bottom-left wave */}
      <div className="pointer-events-none absolute -bottom-[240px] -left-[120px] h-[420px] w-[720px] rounded-[50%] bg-gradient-to-br from-[#d9e7ff] to-[#edf3ff]" />

      {/* Bottom-right wave */}
      <div className="pointer-events-none absolute -bottom-[320px] right-[-100px] h-[480px] w-[720px] rounded-[50%] bg-gradient-to-tl from-[#cbdcff] to-[#f5f8ff] opacity-90" />

      {/* Decorative curved rings */}
      <div className="pointer-events-none absolute right-[4%] top-[22%] hidden h-[540px] w-[540px] rounded-full border-[50px] border-white/50 lg:block" />
      <div className="pointer-events-none absolute right-[8%] top-[26%] hidden h-[480px] w-[480px] rounded-full border border-[#cbdcff]/50 lg:block" />

      {/* Subtle grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(100,130,200,.12) 1px, transparent 1px),
            linear-gradient(90deg, rgba(100,130,200,.12) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          maskImage:
            "linear-gradient(to bottom, transparent, black 25%, black 75%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent, black 25%, black 75%, transparent)",
        }}
      />

      {/* ==========================================================
          MAIN CONTENT
      ========================================================== */}

      <main className="relative z-10 flex min-h-screen w-full items-center justify-center px-4 py-8 sm:px-6">
        <div className="mx-auto grid w-full max-w-[1160px] grid-cols-1 items-center gap-6 lg:grid-cols-[0.82fr_1fr_0.88fr] lg:gap-8">
          {/* ======================================================
              LEFT — marketing message (desktop only)
          ====================================================== */}
          <section className="hidden pl-2 lg:block xl:pl-6">
            <div className="max-w-[340px]">
              <h1 className="font-sans text-[44px] font-extrabold leading-[1.02] tracking-[-2px] text-[#101a33] xl:text-[50px]">
                <span className="block">Ideas</span>
                <span className="block">today.</span>
                <span className="block bg-gradient-to-r from-[#657cff] via-[#734be8] to-[#b23de1] bg-clip-text text-transparent">
                  Impact
                </span>
                <span className="block bg-gradient-to-r from-[#657cff] via-[#734be8] to-[#a53ddd] bg-clip-text text-transparent">
                  tomorrow.
                </span>
              </h1>

              <div className="mt-5 h-[3.5px] w-12 rounded-full bg-gradient-to-r from-[#4d7cff] to-[#7651e8]" />

              <p className="mt-5 max-w-[280px] text-[16px] font-medium leading-7 text-[#687b9c]">
                A startup accelerator
                <br />
                for bold builders.
              </p>

              <div className="mt-20">
                <p className="whitespace-nowrap text-[10px] font-bold uppercase tracking-[3.5px] text-[#50658a]">
                  Fueling tomorrow&apos;s founders
                </p>
                <div className="mt-3 h-[2.5px] w-12 rounded-full bg-gradient-to-r from-[#637bff] to-[#7651e8]" />
              </div>
            </div>
          </section>

          {/* ======================================================
              CENTER — register card
          ====================================================== */}
          <section className="flex justify-center">
            <div className="w-full max-w-[430px] rounded-[24px] border border-white bg-white/95 px-6 py-8 shadow-[0_20px_50px_rgba(53,70,120,0.12)] backdrop-blur-xl sm:px-8 sm:py-9">
              {/* Logo */}
              <div className="mb-5 flex justify-center">
                <Link to="/" className="transition-transform duration-200 hover:scale-105">
                  <MintLogo variant={1} height={42} textColor="#0f172a" />
                </Link>
              </div>

              <div className="text-center">
                <h2 className="font-sans text-[26px] font-extrabold tracking-[-1px] text-[#10182d] sm:text-[28px]">
                  Create your account
                </h2>
                <p className="mt-1 text-[14.5px] text-[#7183a1]">
                  Start generating pitch decks with Mint
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-6">
                {error && (
                  <p
                    role="alert"
                    className="mb-4 rounded-[12px] border border-red-200 bg-red-50 px-3.5 py-2.5 text-center text-[13.5px] font-medium text-red-600"
                  >
                    {error}
                  </p>
                )}

                {/* FULL NAME */}
                <div>
                  <label
                    htmlFor="name"
                    className="mb-2 block text-[13.5px] font-bold text-[#152039]"
                  >
                    Full name
                  </label>
                  <div className="relative">
                    <User
                      size={17}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#101a30]"
                    />
                    <input
                      id="name"
                      type="text"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Smith"
                      required
                      className="h-[48px] w-full rounded-[14px] border border-[#cfdbef] bg-[#eaf2ff] pl-11 pr-4 text-[14.5px] text-[#111827] shadow-[inset_0_1px_2px_rgba(20,40,80,.04)] outline-none transition-all duration-200 placeholder:text-[#8a9bb8] focus:border-[#7189ed] focus:bg-white focus:ring-4 focus:ring-[#7189ed]/10"
                    />
                  </div>
                </div>

                {/* EMAIL */}
                <div className="mt-4">
                  <label
                    htmlFor="email"
                    className="mb-2 block text-[13.5px] font-bold text-[#152039]"
                  >
                    Email
                  </label>
                  <div className="relative">
                    <Mail
                      size={17}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#101a30]"
                    />
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                      className="h-[48px] w-full rounded-[14px] border border-[#cfdbef] bg-[#eaf2ff] pl-11 pr-4 text-[14.5px] text-[#111827] shadow-[inset_0_1px_2px_rgba(20,40,80,.04)] outline-none transition-all duration-200 placeholder:text-[#8a9bb8] focus:border-[#7189ed] focus:bg-white focus:ring-4 focus:ring-[#7189ed]/10"
                    />
                  </div>
                </div>

                {/* PASSWORD */}
                <div className="mt-4">
                  <label
                    htmlFor="password"
                    className="mb-2 block text-[13.5px] font-bold text-[#152039]"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock
                      size={17}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#101a30]"
                    />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a password"
                      required
                      className="h-[48px] w-full rounded-[14px] border border-[#cfdbef] bg-[#eaf2ff] pl-11 pr-12 text-[14.5px] text-[#111827] shadow-[inset_0_1px_2px_rgba(20,40,80,.04)] outline-none transition-all duration-200 placeholder:text-[#8a9bb8] focus:border-[#7189ed] focus:bg-white focus:ring-4 focus:ring-[#7189ed]/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#17223b] transition-colors hover:text-[#526de0]"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* SUBMIT BUTTON */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group mt-5 flex h-[50px] w-full items-center justify-center gap-2.5 rounded-[14px] bg-gradient-to-r from-[#11192d] to-[#10192e] text-[15px] font-bold text-white shadow-[0_6px_16px_rgba(10,20,45,.20)] transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_10px_22px_rgba(10,20,45,.25)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isLoading ? (
                    <>
                      <span
                        aria-hidden
                        className="h-[16px] w-[16px] animate-spin rounded-full border-2 border-white/30 border-t-white"
                      />
                      <span>Creating account…</span>
                    </>
                  ) : (
                    <>
                      <span>Create account</span>
                      <ArrowRight
                        size={18}
                        className="transition-transform duration-200 group-hover:translate-x-1"
                      />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-5 text-center">
                <p className="text-[14px] text-[#71819e]">
                  Already have an account?{" "}
                  <Link
                    to="/login"
                    className="font-bold text-[#0755ed] transition-colors hover:text-[#493ed5]"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          </section>

          {/* ======================================================
              RIGHT — rocket illustration (desktop only)
          ====================================================== */}
          <section className="relative hidden h-[520px] lg:block">
            {/* Rocket + vapour trail */}
            <RocketIllustration className="pointer-events-none absolute -right-[40px] top-[0px] h-[400px] w-[460px] xl:-right-[10px]" />

            {/* Floating capability cards */}
            <div className="absolute left-[0px] top-[70px] flex h-[86px] w-[86px] flex-col items-center justify-center gap-2 rounded-[20px] bg-white/85 shadow-[0_14px_32px_-8px_rgba(60,80,160,.24)] ring-1 ring-white/70 backdrop-blur-xl xl:left-[4px]">
              <IdeateIcon />
              <span className="text-[12px] font-semibold text-[#2b3a5c]">Ideate</span>
            </div>

            <div className="absolute right-[10px] top-[250px] flex h-[86px] w-[86px] flex-col items-center justify-center gap-2 rounded-[20px] bg-white/85 shadow-[0_14px_32px_-8px_rgba(60,80,160,.24)] ring-1 ring-white/70 backdrop-blur-xl xl:right-[24px]">
              <BuildIcon />
              <span className="text-[12px] font-semibold text-[#2b3a5c]">Build</span>
            </div>

            <div className="absolute left-[70px] top-[370px] flex h-[86px] w-[86px] flex-col items-center justify-center gap-2 rounded-[20px] bg-white/85 shadow-[0_14px_32px_-8px_rgba(60,80,160,.24)] ring-1 ring-white/70 backdrop-blur-xl xl:left-[90px]">
              <ScaleIcon />
              <span className="text-[12px] font-semibold text-[#2b3a5c]">Scale</span>
            </div>

            {/* Handwritten note */}
            <div className="absolute bottom-[20px] right-[10px] rotate-[-8deg] text-right">
              <div
                className="text-[26px] leading-[1.15] text-[#5b6b88]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Start
                <br />
                Scale
                <br />
                Succeed
              </div>
              <svg
                className="ml-auto mt-1 block"
                width="105"
                height="14"
                viewBox="0 0 132 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M2 12C28 5 84 2 130 6"
                  stroke="#5E83FF"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            {/* Decorative dots */}
            <div className="absolute right-[100px] top-[40px] h-2 w-2 rounded-full bg-[#7c67e8]/70" />
            <div className="absolute left-[140px] top-[210px] h-2 w-2 rounded-full bg-[#6d91ff]/70" />
            <div className="absolute bottom-[180px] right-[140px] h-2.5 w-2.5 rounded-full bg-[#9c78ec]/35" />
          </section>
        </div>
      </main>
    </div>
  );
}
