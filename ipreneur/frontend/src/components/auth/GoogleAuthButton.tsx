import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { useAuthStore } from "@/stores/authStore";

/** "Or continue with Google" divider + button, shared by Login and Register.
 *  Hides itself when VITE_GOOGLE_CLIENT_ID isn't set at build time, rather
 *  than rendering a button that can only ever fail. */
export function GoogleAuthButton({
  onSuccess,
  onError,
}: {
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) return null;

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      onError("Google did not return a sign-in token.");
      return;
    }
    try {
      await loginWithGoogle(credentialResponse.credential);
      onSuccess();
    } catch (err: any) {
      onError(err?.response?.data?.detail || "Google sign-in failed");
    }
  };

  return (
    <div className="mt-5">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-[#e3e9f5]" />
        <span className="text-[12px] font-medium text-[#8a98b8]">or</span>
        <div className="h-px flex-1 bg-[#e3e9f5]" />
      </div>
      <div className="mt-4 flex justify-center">
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={() => onError("Google sign-in failed")}
          theme="outline"
          size="large"
          shape="pill"
          width={320}
        />
      </div>
    </div>
  );
}
