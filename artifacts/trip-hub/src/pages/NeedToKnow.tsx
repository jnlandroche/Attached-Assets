import { useListContacts } from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Phone, MapPin, AlertCircle, HelpCircle, Activity } from "lucide-react";

const getCategoryIcon = (cat: string) => {
  switch (cat) {
    case 'emergency':
    case 'hospital':
    case 'urgent_care':
      return AlertCircle;
    case 'pharmacy':
      return Activity;
    case 'taxi':
    case 'host':
    default:
      return HelpCircle;
  }
};

const getCategoryColor = (cat: string) => {
  if (['emergency', 'hospital', 'urgent_care'].includes(cat)) return "text-hibiscus-500 bg-hibiscus-500/10";
  if (['host', 'taxi'].includes(cat)) return "text-lagoon-600 bg-lagoon-600/10";
  return "text-ink-700 bg-ink-900/5";
};

export default function NeedToKnow() {
  const { data: contacts = [], isLoading } = useListContacts();

  // Group contacts by category
  const groupedContacts = contacts.reduce((acc, contact) => {
    const cat = contact.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(contact);
    return acc;
  }, {} as Record<string, typeof contacts>);

  const categoryOrder = ['emergency', 'hospital', 'urgent_care', 'pharmacy', 'host', 'taxi', 'other'];

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

          const catName = catKey.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
          const Icon = getCategoryIcon(catKey);

          return (
            <div key={catKey}>
              <h2 className="font-display text-xl text-ink-950 mb-3 px-1 flex items-center gap-2">
                <Icon className={`w-5 h-5 ${getCategoryColor(catKey).split(' ')[0]}`} />
                {catName}
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
                        <a href={`tel:${contact.phone}`} className="flex items-center gap-3 bg-sand-50 p-3 rounded-xl hover:bg-sand-100 transition-colors tap text-ink-900 font-medium">
                          <div className="w-8 h-8 rounded-full bg-lagoon-600/10 flex items-center justify-center shrink-0">
                            <Phone className="w-4 h-4 text-lagoon-600" />
                          </div>
                          {contact.phone}
                        </a>
                      )}
                      
                      {contact.address && (
                        <a href={`https://maps.google.com/?q=${encodeURIComponent(contact.address)}`} target="_blank" rel="noreferrer" className="flex items-start gap-3 bg-sand-50 p-3 rounded-xl hover:bg-sand-100 transition-colors tap text-ink-900 font-medium">
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
