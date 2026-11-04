import { toast, Toaster as SonnerToaster, type ToasterProps } from "sonner";

const Toaster = (props: ToasterProps) => {
  return <SonnerToaster {...props} richColors />;
};

export { toast, Toaster };
