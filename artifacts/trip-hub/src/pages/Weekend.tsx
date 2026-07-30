import { useListItineraryItems, useCreateItineraryItem, useDeleteItineraryItem, useUpdateItineraryItem, getListItineraryItemsQueryKey } from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Sun, Sunset, Moon, Utensils, Sailboat, Map, Plus, MoreVertical, Trash2 } from "lucide-react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const getCategoryIcon = (cat?: string | null) => {
  switch (cat) {
    case 'morning': return <Sun className="w-5 h-5 text-brass-500" />;
    case 'afternoon': return <Sun className="w-5 h-5 text-papaya-500" />;
    case 'evening': return <Sunset className="w-5 h-5 text-hibiscus-500" />;
    case 'night': return <Moon className="w-5 h-5 text-ink-700" />;
    case 'food': return <Utensils className="w-5 h-5 text-lagoon-600" />;
    case 'boat': return <Sailboat className="w-5 h-5 text-lagoon-600" />;
    case 'explore': return <Map className="w-5 h-5 text-brass-600" />;
    default: return <div className="w-2 h-2 rounded-full bg-ink-300" />;
  }
};

export default function Weekend() {
  const { data: items = [], isLoading } = useListItineraryItems();
  const createItem = useCreateItineraryItem();
  const updateItem = useUpdateItineraryItem();
  const deleteItem = useDeleteItineraryItem();
  const queryClient = useQueryClient();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form state
  const [dayLabel, setDayLabel] = useState("Friday");
  const [time, setTime] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("explore");

  const days = items.reduce((acc, item) => {
    if (!acc[item.dayLabel]) acc[item.dayLabel] = [];
    acc[item.dayLabel].push(item);
    return acc;
  }, {} as Record<string, typeof items>);

  const handleOpenAdd = () => {
    setEditingId(null);
    setDayLabel("Friday");
    setTime("");
    setTitle("");
    setDescription("");
    setCategory("explore");
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingId(item.id);
    setDayLabel(item.dayLabel);
    setTime(item.time || "");
    setTitle(item.title);
    setDescription(item.description || "");
    setCategory(item.category || "explore");
    setIsDrawerOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Remove this plan?")) {
      deleteItem.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListItineraryItemsQueryKey() });
          toast.success("Removed");
        }
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return toast.error("Title required");

    const payload = { dayLabel, time, title, description, category };

    if (editingId) {
      updateItem.mutate({ id: editingId, data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListItineraryItemsQueryKey() });
          setIsDrawerOpen(false);
          toast.success("Updated");
        }
      });
    } else {
      createItem.mutate({ data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListItineraryItemsQueryKey() });
          setIsDrawerOpen(false);
          toast.success("Added");
        }
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-20 bg-sand-200/50 animate-pulse rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="pb-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center pr-5">
        <PageHeader eyebrow="The Plan" title="Weekend Agenda" subtitle="Loose plans, tight vibes." />
        <button onClick={handleOpenAdd} className="w-12 h-12 bg-lagoon-600 text-white rounded-full flex items-center justify-center shadow-card tap">
          <Plus className="w-6 h-6" />
        </button>
      </div>

      <div className="px-5 space-y-10 mt-4">
        {Object.entries(days).map(([day, dayItems]) => (
          <div key={day} className="relative">
            <h2 className="font-display text-2xl text-ink-950 mb-6 sticky top-0 bg-sand-50/90 backdrop-blur py-2 z-20">
              {day}
            </h2>
            
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-sand-200">
              {dayItems.map(item => (
                <div key={item.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-sand-50 bg-white shadow-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                    {getCategoryIcon(item.category)}
                  </div>
                  
                  <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-2xl shadow-card ml-4 md:ml-0 relative">
                    <div className="absolute top-3 right-2 flex gap-1">
                      <button onClick={() => handleOpenEdit(item)} className="p-1.5 text-ink-400 hover:text-ink-900 tap"><MoreVertical className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(item.id)} className="p-1.5 text-ink-400 hover:text-hibiscus-500 tap"><Trash2 className="w-4 h-4" /></button>
                    </div>

                    {item.time && (
                      <div className="text-xs font-bold text-lagoon-600 mb-1">{item.time}</div>
                    )}
                    <h3 className="font-bold text-ink-950 text-lg pr-12">{item.title}</h3>
                    {item.description && (
                      <p className="text-sm text-ink-700/80 mt-2 leading-relaxed">{item.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {Object.keys(days).length === 0 && (
          <div className="text-center text-ink-900/40 py-12 border-2 border-dashed border-sand-200 rounded-3xl mx-5">
            No itinerary items yet. Go with the flow!
          </div>
        )}
      </div>

      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent>
          <div className="px-2">
            <h2 className="font-display text-2xl text-ink-950 mb-6">{editingId ? "Edit Plan" : "Add Plan"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4 pb-8">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-bold text-ink-900 block mb-1">Day</label>
                  <select value={dayLabel} onChange={e => setDayLabel(e.target.value)} className="w-full bg-white border-none rounded-xl p-3 shadow-sm focus:ring-2 ring-lagoon-600">
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                    <option value="Sunday">Sunday</option>
                    <option value="Monday">Monday</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-bold text-ink-900 block mb-1">Time (optional)</label>
                  <input type="text" placeholder="e.g. 10:00 AM" value={time} onChange={e => setTime(e.target.value)} className="w-full bg-white border-none rounded-xl p-3 shadow-sm focus:ring-2 ring-lagoon-600" />
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-ink-900 block mb-1">Title</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="w-full bg-white border-none rounded-xl p-3 shadow-sm focus:ring-2 ring-lagoon-600" />
              </div>

              <div>
                <label className="text-sm font-bold text-ink-900 block mb-1">Description (optional)</label>
                <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-white border-none rounded-xl p-3 shadow-sm focus:ring-2 ring-lagoon-600" />
              </div>

              <div>
                <label className="text-sm font-bold text-ink-900 block mb-1">Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-white border-none rounded-xl p-3 shadow-sm focus:ring-2 ring-lagoon-600">
                  <option value="explore">Explore</option>
                  <option value="food">Food & Drink</option>
                  <option value="boat">Boat/Beach</option>
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="evening">Evening</option>
                  <option value="night">Night</option>
                </select>
              </div>

              <button type="submit" disabled={createItem.isPending || updateItem.isPending} className="w-full bg-lagoon-600 text-white font-bold py-4 rounded-xl shadow-md mt-4 tap">
                {editingId ? "Save Changes" : "Add to Plan"}
              </button>
            </form>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
