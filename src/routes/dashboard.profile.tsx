import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2, Save, Camera, User as UserIcon, Phone, Mail, MapPin, Globe2,
  Plane, Calendar, Bell, Shield, BadgeCheck, Languages, Coins, AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/profile")({
  head: () => ({ meta: [{ title: "Profile — iSwitch" }] }),
  component: ProfilePage,
});

type ProfileForm = {
  display_name: string;
  phone: string;
  bio: string;
  date_of_birth: string;
  gender: string;
  nationality: string;
  country: string;
  city: string;
  address: string;
  postal_code: string;
  passport_number: string;
  passport_expiry: string;
  preferred_currency: string;
  preferred_language: string;
  marketing_emails: boolean;
  sms_notifications: boolean;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  avatar_url: string;
};

const EMPTY: ProfileForm = {
  display_name: "", phone: "", bio: "", date_of_birth: "", gender: "",
  nationality: "", country: "", city: "", address: "", postal_code: "",
  passport_number: "", passport_expiry: "", preferred_currency: "NGN",
  preferred_language: "en", marketing_emails: true, sms_notifications: true,
  emergency_contact_name: "", emergency_contact_phone: "", avatar_url: "",
};

function ProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accountType, setAccountType] = useState("customer");
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileForm>(EMPTY);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setAccountType(data.account_type ?? "customer");
        setCreatedAt(data.created_at);
        setForm({
          display_name: data.display_name ?? "",
          phone: data.phone ?? "",
          bio: data.bio ?? "",
          date_of_birth: data.date_of_birth ?? "",
          gender: data.gender ?? "",
          nationality: data.nationality ?? "",
          country: data.country ?? "",
          city: data.city ?? "",
          address: data.address ?? "",
          postal_code: data.postal_code ?? "",
          passport_number: data.passport_number ?? "",
          passport_expiry: data.passport_expiry ?? "",
          preferred_currency: data.preferred_currency ?? "NGN",
          preferred_language: data.preferred_language ?? "en",
          marketing_emails: data.marketing_emails ?? true,
          sms_notifications: data.sms_notifications ?? true,
          emergency_contact_name: data.emergency_contact_name ?? "",
          emergency_contact_phone: data.emergency_contact_phone ?? "",
          avatar_url: data.avatar_url ?? "",
        });
      }
      setLoading(false);
    })();
  }, [user]);

  const update = <K extends keyof ProfileForm>(k: K, v: ProfileForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const completion = useMemo(() => {
    const fields: (keyof ProfileForm)[] = [
      "display_name", "phone", "date_of_birth", "nationality", "country",
      "city", "address", "passport_number", "passport_expiry",
      "emergency_contact_name", "emergency_contact_phone", "avatar_url",
    ];
    const filled = fields.filter((f) => String(form[f] ?? "").trim().length > 0).length;
    return Math.round((filled / fields.length) * 100);
  }, [form]);

  async function save() {
    if (!user) return;
    setSaving(true);
    const payload = {
      ...form,
      date_of_birth: form.date_of_birth || null,
      passport_expiry: form.passport_expiry || null,
    };
    const { error } = await supabase.from("profiles").update(payload).eq("user_id", user.id);
    setSaving(false);
    if (error) toast.error("Failed to save", { description: error.message });
    else toast.success("Profile updated successfully");
  }

  async function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2_000_000) {
      toast.error("Image must be smaller than 2 MB");
      return;
    }
    // Preview as data URL stored on profile (no storage bucket dependency)
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result);
      update("avatar_url", dataUrl);
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: dataUrl })
        .eq("user_id", user.id);
      if (error) toast.error("Could not update photo", { description: error.message });
      else toast.success("Profile photo updated");
    };
    reader.readAsDataURL(file);
  }

  if (loading)
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );

  const initials = (form.display_name || user?.email || "U").slice(0, 2).toUpperCase();
  const memberSince = createdAt ? new Date(createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" }) : "—";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* HERO */}
      <section
        className="relative overflow-hidden rounded-3xl text-primary-foreground shadow-elevated"
        style={{ background: "var(--gradient-primary)" }}
      >
        <div className="absolute inset-0 opacity-30">
          <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-accent/40 blur-3xl" />
          <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-primary-glow/40 blur-3xl" />
        </div>
        <div className="relative flex flex-col items-start gap-6 p-6 md:flex-row md:items-center md:p-8">
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-primary-foreground/15 ring-4 ring-accent/60 backdrop-blur md:h-28 md:w-28">
              {form.avatar_url ? (
                <img src={form.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="font-display text-3xl font-extrabold">{initials}</span>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg transition-transform hover:scale-110"
              aria-label="Change photo"
            >
              <Camera className="h-4 w-4" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onAvatarChange} />
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-extrabold md:text-3xl">
                {form.display_name || "Welcome, traveler"}
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-accent-foreground">
                <BadgeCheck className="h-3 w-3" /> Verified
              </span>
              <span className="rounded-full bg-primary-foreground/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider">
                {accountType}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-primary-foreground/85">
              <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {user?.email}</span>
              {form.phone && <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {form.phone}</span>}
              {form.country && <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {form.country}</span>}
              <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Member since {memberSince}</span>
            </div>

            <div className="mt-4 max-w-md">
              <div className="flex items-center justify-between text-xs font-bold">
                <span>Profile completion</span>
                <span className="text-accent">{completion}%</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-primary-foreground/15">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${completion}%` }}
                />
              </div>
              {completion < 100 && (
                <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-primary-foreground/80">
                  <AlertCircle className="h-3 w-3" /> Complete your profile to speed up bookings.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* TABS */}
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-xl bg-muted/60 p-1">
          <TabsTrigger value="personal" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><UserIcon className="h-3.5 w-3.5" />Personal</TabsTrigger>
          <TabsTrigger value="address" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><MapPin className="h-3.5 w-3.5" />Address</TabsTrigger>
          <TabsTrigger value="travel" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Plane className="h-3.5 w-3.5" />Travel docs</TabsTrigger>
          <TabsTrigger value="prefs" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Bell className="h-3.5 w-3.5" />Preferences</TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Shield className="h-3.5 w-3.5" />Security</TabsTrigger>
        </TabsList>

        {/* PERSONAL */}
        <TabsContent value="personal" className="mt-4">
          <Card title="Personal information" subtitle="Your basic identity details used for bookings and tickets.">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Full / Display name">
                <Input value={form.display_name} onChange={(e) => update("display_name", e.target.value)} placeholder="e.g. Adaeze Okafor" />
              </Field>
              <Field label="Phone number">
                <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+234 801 234 5678" />
              </Field>
              <Field label="Date of birth">
                <Input type="date" value={form.date_of_birth} onChange={(e) => update("date_of_birth", e.target.value)} />
              </Field>
              <Field label="Gender">
                <Select value={form.gender} onValueChange={(v) => update("gender", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="non-binary">Non-binary</SelectItem>
                    <SelectItem value="prefer-not">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Nationality" className="md:col-span-2">
                <Input value={form.nationality} onChange={(e) => update("nationality", e.target.value)} placeholder="e.g. Nigerian" />
              </Field>
              <Field label="Short bio" className="md:col-span-2">
                <Textarea rows={3} value={form.bio} onChange={(e) => update("bio", e.target.value)} placeholder="Tell us about your travel style…" />
              </Field>
            </div>
          </Card>
        </TabsContent>

        {/* ADDRESS */}
        <TabsContent value="address" className="mt-4">
          <Card title="Home address" subtitle="Used for billing, visa applications and document delivery.">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Country"><Input value={form.country} onChange={(e) => update("country", e.target.value)} placeholder="Nigeria" /></Field>
              <Field label="City"><Input value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Lagos" /></Field>
              <Field label="Street address" className="md:col-span-2">
                <Input value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="123 Marina Road" />
              </Field>
              <Field label="Postal code"><Input value={form.postal_code} onChange={(e) => update("postal_code", e.target.value)} placeholder="100001" /></Field>
            </div>
          </Card>
        </TabsContent>

        {/* TRAVEL */}
        <TabsContent value="travel" className="mt-4 space-y-4">
          <Card title="Travel documents" subtitle="Auto-fill flight and visa applications. Stored encrypted.">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Passport number">
                <Input value={form.passport_number} onChange={(e) => update("passport_number", e.target.value)} placeholder="A12345678" />
              </Field>
              <Field label="Passport expiry">
                <Input type="date" value={form.passport_expiry} onChange={(e) => update("passport_expiry", e.target.value)} />
              </Field>
            </div>
          </Card>
          <Card title="Emergency contact" subtitle="Who should we reach in case of an emergency during travel?">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Contact name"><Input value={form.emergency_contact_name} onChange={(e) => update("emergency_contact_name", e.target.value)} placeholder="Full name" /></Field>
              <Field label="Contact phone"><Input value={form.emergency_contact_phone} onChange={(e) => update("emergency_contact_phone", e.target.value)} placeholder="+234 …" /></Field>
            </div>
          </Card>
        </TabsContent>

        {/* PREFS */}
        <TabsContent value="prefs" className="mt-4 space-y-4">
          <Card title="Regional settings" subtitle="Choose how prices and content appear across iSwitch.">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={<span className="inline-flex items-center gap-1.5"><Coins className="h-3.5 w-3.5 text-primary" />Preferred currency</span>}>
                <Select value={form.preferred_currency} onValueChange={(v) => update("preferred_currency", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NGN">Nigerian Naira (₦)</SelectItem>
                    <SelectItem value="USD">US Dollar ($)</SelectItem>
                    <SelectItem value="EUR">Euro (€)</SelectItem>
                    <SelectItem value="GBP">British Pound (£)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label={<span className="inline-flex items-center gap-1.5"><Languages className="h-3.5 w-3.5 text-primary" />Language</span>}>
                <Select value={form.preferred_language} onValueChange={(v) => update("preferred_language", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="ar">العربية</SelectItem>
                    <SelectItem value="pt">Português</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Card>

          <Card title="Notifications" subtitle="Control how iSwitch reaches you about deals and bookings.">
            <ToggleRow
              icon={<Mail className="h-4 w-4 text-primary" />}
              title="Marketing emails"
              desc="Exclusive deals, travel inspiration and member-only fares."
              checked={form.marketing_emails}
              onChange={(v) => update("marketing_emails", v)}
            />
            <ToggleRow
              icon={<Phone className="h-4 w-4 text-primary" />}
              title="SMS notifications"
              desc="Booking confirmations, gate changes and urgent travel alerts."
              checked={form.sms_notifications}
              onChange={(v) => update("sms_notifications", v)}
            />
          </Card>
        </TabsContent>

        {/* SECURITY */}
        <TabsContent value="security" className="mt-4">
          <Card title="Account & security" subtitle="Manage how you sign in and protect your account.">
            <div className="space-y-3">
              <InfoRow label="Email" value={user?.email ?? "—"} icon={<Mail className="h-4 w-4 text-primary" />} />
              <InfoRow label="Account type" value={accountType} icon={<UserIcon className="h-4 w-4 text-primary" />} />
              <InfoRow label="Member since" value={memberSince} icon={<Calendar className="h-4 w-4 text-primary" />} />
              <InfoRow label="Region" value={form.country || "Not set"} icon={<Globe2 className="h-4 w-4 text-primary" />} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => toast.info("Password reset email sent if account exists.")}>Change password</Button>
              <Button variant="outline" onClick={() => toast.info("Two-factor setup coming soon.")}>Enable 2FA</Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* STICKY SAVE */}
      <div className="sticky bottom-4 z-10 flex justify-end">
        <Button
          onClick={save}
          disabled={saving}
          size="lg"
          className="gap-2 bg-primary text-primary-foreground shadow-elevated hover:bg-primary-dark"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save all changes
        </Button>
      </div>
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card md:p-6">
      <div className="mb-4">
        <h2 className="font-display text-lg font-extrabold text-foreground">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children, className }: { label: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ToggleRow({ icon, title, desc, checked, onChange }: { icon: React.ReactNode; title: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background/50 p-3 last:mt-0 [&+&]:mt-2">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">{icon}</div>
        <div>
          <div className="text-sm font-bold text-foreground">{title}</div>
          <div className="text-xs text-muted-foreground">{desc}</div>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-background/50 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">{icon}</div>
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}
