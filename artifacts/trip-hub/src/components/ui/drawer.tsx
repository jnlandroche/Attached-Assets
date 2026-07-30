import { Drawer as DrawerPrimitive } from "vaul"

const Drawer = DrawerPrimitive.Root
const DrawerTrigger = DrawerPrimitive.Trigger
const DrawerPortal = DrawerPrimitive.Portal
const DrawerClose = DrawerPrimitive.Close

const DrawerContent = ({ children, ...props }: any) => (
  <DrawerPortal>
    <DrawerPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40" />
    <DrawerPrimitive.Content
      className="bg-sand-50 flex flex-col rounded-t-[20px] mt-24 h-[96%] fixed bottom-0 left-0 right-0 max-w-md mx-auto z-50 outline-none"
      {...props}
    >
      <div className="p-4 bg-sand-50 rounded-t-[20px] flex-1 overflow-y-auto">
        <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-sand-200 mb-6" />
        {children}
      </div>
    </DrawerPrimitive.Content>
  </DrawerPortal>
)

export { Drawer, DrawerTrigger, DrawerContent, DrawerClose }
