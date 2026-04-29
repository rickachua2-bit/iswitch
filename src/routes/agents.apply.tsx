import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  Loader2, Briefcase, Upload, FileCheck2, Clock, X,
  User, Mail, Lock, Phone, Building2, Hash, Globe, MapPin, Layers, ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/hooks/use-auth";
import { AuthSplitLayout } from "@/components/AuthSplitLayout";
import { AuthField, PasswordStrength } from "@/components/AuthField";

export const Route = createFileRoute("/agents/apply")({
  head: () => ({
    meta: [
      { title: "Apply as agent — iSwitch B2B" },
      { name: "description", content: "Become an iSwitch travel agent. Earn commissions on every booking. KYB verification required." },
    ],
  }),
  component: AgentApplyPage,
});

type ApplicationStatus = "pending" | "approved" | "rejected";

function AgentApplyPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<"signup" | "kyb" | "status">("signup");

  // Signup fields
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");

  // KYB fields
  const [businessName, setBusinessName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [country, setCountry] = useState("Nigeria");
  const [contactPhone, setContactPhone] = useState("");
  const [businessType, setBusinessType] = useState("Travel Agency");
  const [website, setWebsite] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const [existingStatus, setExistingStatus] = useState<ApplicationStatus | null>(null);
  const [existingBusiness, setExistingBusiness] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Decide which screen to show whenever auth/profile loads
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setMode("signup");
      return;
    }
    void (async () => {
      const { data } = await supabase
        .from("agent_applications")
        .select("status, business_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setExistingStatus(data.status as ApplicationStatus);
        setExistingBusiness(data.business_name);
        setMode("status");
      } else {
        setMode("kyb");
      }
    })();
  }, [user, authLoading]);

  async function handleSignup(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/agents/apply`,
        data: { display_name: displayName, phone, account_type: "agent" },
      },
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setMode("kyb");
  }

  async function handleKyb(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!user) return;
    if (files.length === 0) {
      setError("Please upload at least one business document.");
      return;
    }
    setLoading(true);

    // Upload all files under <user_id>/<timestamp>-<filename>
    const uploadedPaths: string[] = [];
    for (const file of files) {
      const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("kyb-documents").upload(path, file);
      if (upErr) {
        setError(`Upload failed: ${upErr.message}`);
        setLoading(false);
        return;
      }
      uploadedPaths.push(path);
    }

    const { error: insErr } = await supabase.from("agent_applications").insert({
      user_id: user.id,
      business_name: businessName,
      registration_number: registrationNumber,
      country,
      contact_phone: contactPhone,
      business_type: businessType,
      website: website || null,
      document_paths: uploadedPaths,
    });

    setLoading(false);
    if (insErr) {
      setError(insErr.message);
      return;
    }
    setExistingStatus("pending");
    setExistingBusiness(businessName);
    setMode("status");
  }

  // Agent signup gets the two-pane split layout (marketing + form).
  // KYB & status remain in the standard page chrome so the upload area and
  // status detail can breathe.
  if (mode === "signup") {
    return (
      <AuthSplitLayout
        variant="agent"
        formTitle="Create your agent account"
        formSubtitle="Step 1 of 2 — we'll verify your business in step 2 (KYB)."
        showGuestExit={false}
      >
        <SignupStep
          displayName={displayName} setDisplayName={setDisplayName}
          email={email} setEmail={setEmail}
          password={password} setPassword={setPassword}
          phone={phone} setPhone={setPhone}
          loading={loading} error={error} onSubmit={handleSignup}
        />
        <style>{`.input{width:100%;border-radius:.5rem;border:1px solid hsl(var(--input));background:hsl(var(--background));padding:.625rem .75rem;font-size:.875rem;transition:border-color 120ms,box-shadow 120ms}.input:focus{outline:none;border-color:hsl(var(--primary));box-shadow:0 0 0 3px color-mix(in oklab,hsl(var(--primary)) 18%,transparent)}`}</style>
      </AuthSplitLayout>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <Header />
      <section className="bg-gradient-hero py-12">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <span className="inline-block rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
            B2B · Travel agents & businesses
          </span>
          <h1 className="mt-3 font-display text-3xl font-extrabold text-primary-foreground md:text-4xl">
            {mode === "kyb" ? "Verify your business" : "Application status"}
          </h1>
          <p className="mt-2 text-sm text-primary-foreground/85">
            {mode === "kyb"
              ? "Step 2 of 2 — upload your business documents so our team can approve your agent account."
              : "We've received your application. Track its status below."}
          </p>
        </div>
      </section>

      <section className="mx-auto -mt-8 max-w-2xl px-4 pb-16">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-elevated md:p-8">
          {mode === "kyb" && (
            <KybStep
              businessName={businessName} setBusinessName={setBusinessName}
              registrationNumber={registrationNumber} setRegistrationNumber={setRegistrationNumber}
              country={country} setCountry={setCountry}
              contactPhone={contactPhone} setContactPhone={setContactPhone}
              businessType={businessType} setBusinessType={setBusinessType}
              website={website} setWebsite={setWebsite}
              files={files} setFiles={setFiles}
              loading={loading} error={error} onSubmit={handleKyb}
            />
          )}

          {mode === "status" && existingStatus && (
            <StatusStep status={existingStatus} business={existingBusiness ?? ""} onContinue={() => navigate({ to: "/dashboard" })} />
          )}
        </div>
      </section>
      <Footer />

      <style>{`.input{width:100%;border-radius:.375rem;border:1px solid hsl(var(--input));background:hsl(var(--background));padding:.5rem .75rem;font-size:.875rem}.input:focus{outline:none;border-color:hsl(var(--primary));box-shadow:0 0 0 2px color-mix(in oklab,hsl(var(--primary)) 20%,transparent)}`}</style>
    </div>
  );
}

function SignupStep(props: {
  displayName: string; setDisplayName: (v: string) => void;
  email: string; setEmail: (v: string) => void;
  password: string; setPassword: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
  loading: boolean; error: string | null; onSubmit: (e: FormEvent) => void;
}) {
  return (
    <form onSubmit={props.onSubmit} className="space-y-5">
      {/* B2B perks banner */}
      <div className="flex items-center gap-3 rounded-xl border border-accent/30 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 p-3">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md">
          <Briefcase className="h-4 w-4" />
        </span>
        <div className="text-xs">
          <div className="font-extrabold text-foreground">Step 1 of 2 — Agent account</div>
          <div className="text-muted-foreground">
            Already have an iSwitch account?{" "}
            <Link to="/login" className="font-bold text-primary hover:underline">Sign in</Link> first.
          </div>
        </div>
      </div>

      <AuthField
        label="Your full name"
        icon={User}
        required
        value={props.displayName}
        onChange={(e) => props.setDisplayName(e.target.value)}
        placeholder="Your legal name"
        hint="Account owner — this is who we'll communicate with."
      />
      <AuthField
        label="Phone"
        icon={Phone}
        type="tel"
        value={props.phone}
        onChange={(e) => props.setPhone(e.target.value)}
        placeholder="+234 801 234 5678"
        hint="Direct line for urgent ops escalations."
      />
      <AuthField
        label="Work email"
        icon={Mail}
        required
        type="email"
        value={props.email}
        onChange={(e) => props.setEmail(e.target.value)}
        placeholder="you@youragency.com"
        hint="Use your business domain for faster KYB approval."
        valid={props.email.length > 0 && /.+@.+\..+/.test(props.email) ? true : undefined}
      />
      <div className="space-y-2">
        <AuthField
          label="Password"
          icon={Lock}
          required
          type="password"
          minLength={8}
          value={props.password}
          onChange={(e) => props.setPassword(e.target.value)}
          placeholder="At least 8 characters"
        />
        <PasswordStrength value={props.password} />
      </div>

      {props.error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
          {props.error}
        </div>
      )}

      <button
        type="submit"
        disabled={props.loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary via-primary-glow to-accent px-4 py-3 text-sm font-extrabold uppercase tracking-wider text-primary-foreground shadow-glow transition hover:scale-[1.01] disabled:opacity-60"
      >
        {props.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Briefcase className="h-4 w-4" />}
        Continue to KYB
      </button>
    </form>
  );
}

function KybStep(props: {
  businessName: string; setBusinessName: (v: string) => void;
  registrationNumber: string; setRegistrationNumber: (v: string) => void;
  country: string; setCountry: (v: string) => void;
  contactPhone: string; setContactPhone: (v: string) => void;
  businessType: string; setBusinessType: (v: string) => void;
  website: string; setWebsite: (v: string) => void;
  files: File[]; setFiles: (f: File[]) => void;
  loading: boolean; error: string | null; onSubmit: (e: FormEvent) => void;
}) {
  return (
    <form onSubmit={props.onSubmit} className="space-y-5">
      <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
          <ShieldCheck className="h-4 w-4" />
        </span>
        <div className="text-xs">
          <div className="font-extrabold text-foreground">Step 2 of 2 — Business verification</div>
          <div className="text-muted-foreground">Reviews are completed within 1–3 business days.</div>
        </div>
      </div>

      <AuthField
        label="Business name"
        icon={Building2}
        required
        value={props.businessName}
        onChange={(e) => props.setBusinessName(e.target.value)}
        placeholder="Your registered company name"
        hint="Must match the name on your CAC / business license."
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <AuthField
          label="Registration #"
          icon={Hash}
          required
          value={props.registrationNumber}
          onChange={(e) => props.setRegistrationNumber(e.target.value)}
          placeholder="RC123456 / EIN..."
          hint="Government registration number."
        />
        <AuthField
          label="Country"
          icon={MapPin}
          required
          value={props.country}
          onChange={(e) => props.setCountry(e.target.value)}
          placeholder="Country of registration"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <AuthField
          label="Contact phone"
          icon={Phone}
          required
          type="tel"
          value={props.contactPhone}
          onChange={(e) => props.setContactPhone(e.target.value)}
          placeholder="+234 801 234 5678"
        />
        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
            <Layers className="h-3 w-3 text-primary" />
            Business type
          </span>
          <div className="relative">
            <span className="pointer-events-none absolute left-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md bg-gradient-to-br from-primary/15 to-accent/15 text-primary ring-1 ring-primary/15">
              <Layers className="h-4 w-4" />
            </span>
            <select
              value={props.businessType}
              onChange={(e) => props.setBusinessType(e.target.value)}
              className="w-full rounded-xl border-2 border-border bg-background py-3 pl-12 pr-3 text-sm font-semibold text-foreground transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
            >
              {["Travel Agency", "Tour Operator", "Corporate Travel", "Education Consultant", "Immigration Consultant", "Other"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
        </label>
      </div>

      <AuthField
        label="Website (optional)"
        icon={Globe}
        type="url"
        value={props.website}
        onChange={(e) => props.setWebsite(e.target.value)}
        placeholder="https://youragency.com"
        hint="Helps us verify faster."
      />

      <div>
        <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
          <FileCheck2 className="h-3 w-3 text-primary" />
          Business documents
        </span>
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5 px-4 py-7 text-center text-xs text-muted-foreground transition hover:border-primary hover:bg-primary/10">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-md">
            <Upload className="h-5 w-5" />
          </span>
          <span><b className="text-foreground">Click to upload</b> CAC certificate, business license, ID</span>
          <span className="text-[10px] text-muted-foreground">PDF, JPG or PNG · multiple files allowed</span>
          <input
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => props.setFiles(Array.from(e.target.files ?? []))}
          />
        </label>
        {props.files.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs">
            {props.files.map((f) => (
              <li key={f.name} className="flex items-center justify-between rounded-md bg-secondary/60 px-2 py-1.5">
                <span className="truncate"><FileCheck2 className="mr-1 inline h-3 w-3 text-emerald-600" />{f.name}</span>
                <button
                  type="button"
                  onClick={() => props.setFiles(props.files.filter((x) => x !== f))}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={`Remove ${f.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {props.error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
          {props.error}
        </div>
      )}

      <button
        type="submit"
        disabled={props.loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary via-primary-glow to-accent px-4 py-3 text-sm font-extrabold uppercase tracking-wider text-primary-foreground shadow-glow transition hover:scale-[1.01] disabled:opacity-60"
      >
        {props.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />}
        Submit application
      </button>
    </form>
  );
}

function StatusStep({ status, business, onContinue }: { status: ApplicationStatus; business: string; onContinue: () => void }) {
  const config = {
    pending: {
      Icon: Clock,
      title: "Application under review",
      copy: `Thanks! We've received your KYB submission for ${business}. Our team typically responds within 1–3 business days.`,
      tone: "warning" as const,
    },
    approved: {
      Icon: FileCheck2,
      title: "You're approved!",
      copy: `${business} is now an approved iSwitch agent. Visit your dashboard to start booking and earning commission.`,
      tone: "success" as const,
    },
    rejected: {
      Icon: X,
      title: "Application not approved",
      copy: `Your application for ${business} was not approved. Please contact support@iswitch.com for next steps.`,
      tone: "destructive" as const,
    },
  }[status];

  const Icon = config.Icon;
  const toneClass = {
    success: "border-success/30 bg-success/10 text-success",
    warning: "border-accent/40 bg-accent/10 text-accent-foreground",
    destructive: "border-destructive/30 bg-destructive/10 text-destructive",
  }[config.tone];

  return (
    <div className="text-center">
      <div className={`mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full border ${toneClass}`}>
        <Icon className="h-7 w-7" />
      </div>
      <h2 className="mt-4 font-display text-xl font-extrabold">{config.title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{config.copy}</p>
      <button onClick={onContinue} className="mt-6 rounded-md bg-gradient-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-glow">
        Go to dashboard
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
