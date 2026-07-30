import { useListContacts } from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Phone, MapPin,
  Siren,          // emergency
  Hospital,       // hospital
  Stethoscope,    // urgent care
  Pill,           // pharmacy
  KeyRound,       // host / property
  CarFront,       // taxi / transport
  HelpCircle,     // other
} from "lucide-react";

// ── Per-category icon ─────────────────────────────────────────────────────────
const CATEGORY_CONFIG: Record<string, {
  icon: React.ElementType;
  label: string;
  bg: string;        // icon bubble background
  iconCls: string;   // icon color
  headerCls: string; // section heading color
}> = {
  emergency: {
    icon: Siren,
    label: "Emergency",
    bg: "bg-red-100",
    iconCls: "text-red-600",
    headerCls: "text-red-600",
  },
  hospital: {
    icon: Hospital,
    label: "Hospital",
    bg: "bg-blue-50",
    iconCls: "text-blue-600",
    headerCls: "text-blue-700",
  },
  urgent_care: {
    icon: Stethoscope,
    label: "Urgent Care",
    bg: "bg-amber-50",
    iconCls: "text-amber-600",
    headerCls: "text-amber-700",
  },
  pharmacy: {
    icon: Pill,
    label: "Pharmacy",
    bg: "bg-emerald-50",
    iconCls: "text-emerald-600",
    headerCls: "text-emerald-700",
  },
  host: {
    icon: KeyRound,
    label: "Host",
    bg: "bg-lagoon-600/10",
    iconCls: "text-lagoon-600",
    headerCls: "text-lagoon-700",
  },
  taxi: {
    icon: CarFront,
    label: "Taxi & Transport",
    bg: "bg-brass-500/10",
    iconCls: "text-brass-600",
    headerCls: "text-brass-700",
  },
  other: {
    icon: HelpCircle,
    label: "Other",
    bg: "bg-ink-900/5",
    iconCls: "text-ink-500",
    headerCls: "text-ink-600",
  },
};

function getConfig(cat: string) {
  return CATEGORY_CONFIG[cat] ?? CATEGORY_CONFIG.other;
}

export default function NeedToKnow() {
  const { data: contacts = [], isLoading } = useListContacts();

  // Group contacts by category
  const groupedContacts = contacts.reduce((acc, contact) => {
    const cat = contact.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(contact);
    return acc;
  }, {} as Record<string, typeof contacts>);

  const categoryOrder = ["emergency", "hospital", "urgent_care", "pharmacy", "host", "taxi", "other"];

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-20 bg-sand-200/50 animate-pulse rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="pb-8 animate-in fade-in duration-500">
      <PageHeader eyebrow="Essentials" title="Need to Know" subtitle="Emergency info, hosts, and taxis." />

      <div className="px-5 space-y-8">
        {categoryOrder.map(catKey => {
          const catContacts = groupedContacts[catKey];
          if (!catContacts || catContacts.length === 0) return null;

          const cfg = getConfig(catKey);
          const Icon = cfg.icon;

          return (
            <div key={catKey}>
              <h2 className={`font-display text-xl mb-3 px-1 flex items-center gap-2 ${cfg.headerCls}`}>
                <div className={`w-8 h-8 rounded-xl ${cfg.bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${cfg.iconCls}`} />
                </div>
                {cfg.label}
              </h2>

              <div className="space-y-3">
                {catContacts.map(contact => (
                  <div key={contact.id} className="bg-white rounded-2xl p-4 shadow-card">
                    <h3 className="font-bold text-ink-950 text-lg mb-1">{contact.name}</h3>
                    {contact.notes && (
                      <p className="text-sm text-ink-700/80 mb-3">{contact.notes}</p>
                    )}

                    <div className="space-y-2 mt-3">
                      {contact.phone && (
                        <a
                          href={`tel:${contact.phone}`}
                          className="flex items-center gap-3 bg-sand-50 p-3 rounded-xl hover:bg-sand-100 transition-colors tap text-ink-900 font-medium"
                        >
                          <div className="w-8 h-8 rounded-full bg-lagoon-600/10 flex items-center justify-center shrink-0">
                            <Phone className="w-4 h-4 text-lagoon-600" />
                          </div>
                          {contact.phone}
                        </a>
                      )}

                      {contact.address && (
                        <a
                          href={`https://maps.google.com/?q=${encodeURIComponent(contact.address)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-start gap-3 bg-sand-50 p-3 rounded-xl hover:bg-sand-100 transition-colors tap text-ink-900 font-medium"
                        >
                          <div className="w-8 h-8 rounded-full bg-brass-500/10 flex items-center justify-center shrink-0">
                            <MapPin className="w-4 h-4 text-brass-600" />
                          </div>
                          <span className="text-sm leading-tight pt-1">{contact.address}</span>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
