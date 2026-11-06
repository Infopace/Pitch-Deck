import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Mail } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { MintLogo } from "@/components/brand/MintLogo";

const RESEND_COOLDOWN_SECONDS = 45;

/** Lands here right after registering with email/password, or after a
 *  login attempt comes back 403 email_not_verified. Google sign-in never
 *  routes here — that email is already verified at creation. */
export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const promptParam = searchParams.get("prompt");
  const formatParam = searchParams.get("format");

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [resending, setResending] = useState(false);

  const { verifyOtp, resendOtp, isLoading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const goToDashboard = () => {
    if (promptParam) {
      navigate(
        `/dashboard?prompt=${encodeURIComponent(promptParam)}&format=${encodeURIComponent(
          formatParam || "pitch-deck"
        )}`
      );
    } else {
      navigate("/dashboard");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await verifyOtp(email, code);
      goToDashboard();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Verification failed");
    }
  };

  const handleResend = async () => {
    setError("");
    setResending(true);
    try {
      await resendOtp(email);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Could not resend the code");
    } finally {
      setResending(false);
    }
  };

  if (!email) {
    // Landed here with no email in the URL — nothing to verify against.
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#f8faff] px-4 font-sans">
        <div className="w-full max-w-[430px] rounded-[24px] border border-white bg-white/95 px-6 py-8 text-center shadow-[0_20px_50px_rgba(53,70,120,0.12)] sm:px-8 sm:py-9">
          <p className="text-[14.5px] text-[#7183a1]">
            Missing an email to verify.{" "}
            <Link to="/register" className="font-bold text-[#0755ed]">
              Sign up
            </Link>{" "}
            or{" "}
            <Link to="/login" className="font-bold text-[#0755ed]">
              sign in
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#f8faff] font-sans">
      <div className="pointer-events-none absolute -left-40 -top-48 h-[460px] w-[460px] rounded-full bg-gradient-to-br from-[#dce9ff] to-[#edf3ff] opacity-80" />
      <div className="pointer-events-none absolute -right-48 -top-56 h-[560px] w-[560px] rounded-full bg-gradient-to-br from-[#d9e6ff] via-[#c8d9ff] to-[#b9cbff] opacity-80" />

      <main className="relative z-10 flex min-h-screen w-full items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-[430px] rounded-[24px] border border-white bg-white/95 px-6 py-8 shadow-[0_20px_50px_rgba(53,70,120,0.12)] backdrop-blur-xl sm:px-8 sm:py-9">
          <div className="mb-5 flex justify-center">
            <Link to="/" className="transition-transform duration-200 hover:scale-105">
              <MintLogo variant={1} height={42} textColor="#0f172a" />
            </Link>
          </div>

          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#eaf2ff]">
              <Mail size={20} className="text-[#2563eb]" />
            </div>
            <h2 className="font-sans text-[24px] font-extrabold tracking-[-1px] text-[#10182d]">
              Check your email
            </h2>
            <p className="mt-1.5 text-[14.5px] leading-relaxed text-[#7183a1]">
              We sent a 6-digit code to
              <br />
              <span className="font-semibold text-[#152039]">{email}</span>
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

            <label htmlFor="code" className="mb-2 block text-[13.5px] font-bold text-[#152039]">
              Verification code
            </label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              required
              maxLength={6}
              className="h-[52px] w-full rounded-[14px] border border-[#cfdbef] bg-[#eaf2ff] text-center text-[22px] font-bold tracking-[0.4em] text-[#111827] shadow-[inset_0_1px_2px_rgba(20,40,80,.04)] outline-none transition-all duration-200 placeholder:text-[#b9c4dc] placeholder:tracking-[0.4em] focus:border-[#7189ed] focus:bg-white focus:ring-4 focus:ring-[#7189ed]/10"
            />

            <button
              type="submit"
              disabled={isLoading || code.length !== 6}
              className="group mt-5 flex h-[50px] w-full items-center justify-center gap-2.5 rounded-[14px] bg-gradient-to-r from-[#11192d] to-[#10192e] text-[15px] font-bold text-white shadow-[0_6px_16px_rgba(10,20,45,.20)] transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_10px_22px_rgba(10,20,45,.25)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <span
                    aria-hidden
                    className="h-[16px] w-[16px] animate-spin rounded-full border-2 border-white/30 border-t-white"
                  />
                  <span>Verifying…</span>
                </>
              ) : (
                <>
                  <span>Verify and continue</span>
                  <ArrowRight size={18} className="transition-transform duration-200 group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 text-center text-[14px] text-[#71819e]">
            Didn&apos;t get it?{" "}
            {resendCooldown > 0 ? (
              <span className="font-medium text-[#9aa7c2]">Resend in {resendCooldown}s</span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="font-bold text-[#0755ed] transition-colors hover:text-[#493ed5] disabled:opacity-60"
              >
                {resending ? "Sending…" : "Resend code"}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
