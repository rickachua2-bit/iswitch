import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import { AuthProvider } from "@/hooks/use-auth";
import { CurrencyProvider } from "@/hooks/use-currency";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { TranslationProvider } from "@/components/TranslationProvider";
import "@/i18n";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "iSwitch — Limitless Travel. Zero Friction." },
      {
        name: "description",
        content:
          "Connect flights, stays, and visas in one intelligent vault. The next-gen global mobility super app for travelers, founders and frequent flyers.",
      },
      { name: "author", content: "iSwitch Global" },
      { property: "og:title", content: "iSwitch — Limitless Travel. Zero Friction." },
      { property: "og:description", content: "SwiftTrip Hub is a travel booking application for flights and hotels." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "iSwitch — Limitless Travel. Zero Friction." },
      { name: "description", content: "SwiftTrip Hub is a travel booking application for flights and hotels." },
      { name: "twitter:description", content: "SwiftTrip Hub is a travel booking application for flights and hotels." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/19821692-1139-4713-82d1-a134c889e66a/id-preview-9d8a09d2--4f968f7d-085d-4698-b459-94f5682c4da8.lovable.app-1777120510047.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/19821692-1139-4713-82d1-a134c889e66a/id-preview-9d8a09d2--4f968f7d-085d-4698-b459-94f5682c4da8.lovable.app-1777120510047.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/jpeg", href: "/favicon.jpg" },
      { rel: "apple-touch-icon", href: "/favicon.jpg" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800;900&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <CurrencyProvider>
        <Outlet />
        <MobileBottomNav />
      </CurrencyProvider>
    </AuthProvider>
  );
}
