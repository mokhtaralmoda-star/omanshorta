import { useEffect } from "react";

export default function RopHome() {
  // We no longer redirect here because Netlify _redirects handles serving rop-home.html for the root path (/)
  // This component is just a fallback in case the redirect doesn't work locally
  useEffect(() => {
    // Only redirect if we are not already on the root path or if we are in development
    if (window.location.pathname !== "/" && window.location.pathname !== "/rop-home.html") {
      window.location.href = "/rop-home.html";
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
    </div>
  );
}
