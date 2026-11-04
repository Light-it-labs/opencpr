import { type ComponentProps, useEffect } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { tv } from "tailwind-variants";

import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";

const dialogVariants = tv({
  slots: {
    overlay:
      "fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/80 py-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
    content:
      "relative z-50 grid w-full max-w-[calc(100%-2rem)] gap-4 rounded-lg bg-white p-6 shadow-lg duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:max-w-lg",
    close:
      "absolute top-4 right-4 rounded-xs transition-opacity [&_svg]:pointer-events-none [&_svg]:shrink-0",
    header: "flex flex-col gap-2",
    footer: "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
    title: "font-heading text-lg leading-none font-semibold text-text-default-default",
    description: "text-sm text-text-default-secondary",
  },
});

const { close, content, description, footer, header, overlay, title } = dialogVariants();

/**
 * How dialogs are used across the app:
 *
 * - A feature dialog renders `Dialog.Root` itself and its page keeps it MOUNTED for as long as the
 *   page lives; visibility is driven only by `open` + `onOpenChange`. Never render a dialog
 *   conditionally (`{isOpen ? <XDialog /> : null}`): unmounting `Dialog.Root` while it is open
 *   skips Radix's close sequence, which is what gives `document.body` its pointer events, scroll
 *   and focus back, and the whole page stops reacting to the mouse.
 * - Entity-bound dialogs (edit/delete X) take the entity as an optional prop and derive
 *   `open={Boolean(entity)}`; closing clears the entity in the page. Forms reset their values when
 *   `open` flips to true (`useEffect(() => { if (open) reset(...) }, [open])`), not on mount.
 * - Dialogs opened from a `DropdownMenu` are safe because the menu is non-modal (see
 *   dropdown-menu.tsx), so the dialog is the only layer that ever locks the body.
 */

// Safety net for the rules above: if a dialog is still unmounted while open, or a nested layer
// captured `pointer-events: none` as the body's "original" value, Radix leaves the lock behind and
// the page freezes. Once Radix's own cleanups ran (hence the timeout) and no dialog is open anymore,
// drop the leftover lock.
const releaseLeftoverPointerEventsLock = () => {
  window.setTimeout(() => {
    const isAnyDialogOpen = document.querySelector('[role="dialog"][data-state="open"]');

    if (!isAnyDialogOpen && document.body.style.pointerEvents === "none") {
      document.body.style.pointerEvents = "";
    }
  });
};

const Root = ({ ...props }: ComponentProps<typeof DialogPrimitive.Root>) => {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
};

const Trigger = ({ ...props }: ComponentProps<typeof DialogPrimitive.Trigger>) => {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
};

const Portal = ({ ...props }: ComponentProps<typeof DialogPrimitive.Portal>) => {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
};

const Close = ({ ...props }: ComponentProps<typeof DialogPrimitive.Close>) => {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
};

const Overlay = ({ ...props }: ComponentProps<typeof DialogPrimitive.Overlay>) => {
  return <DialogPrimitive.Overlay className={overlay()} data-slot="dialog-overlay" {...props} />;
};

const Content = ({
  children,
  isDismissible = true,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & {
  isDismissible?: boolean;
}) => {
  useEffect(() => {
    return releaseLeftoverPointerEventsLock;
  }, []);

  return (
    <Portal data-slot="dialog-portal">
      <Overlay>
        <DialogPrimitive.Content
          className={content()}
          data-slot="dialog-content"
          {...props}
          onCloseAutoFocus={(event) => {
            releaseLeftoverPointerEventsLock();

            return props.onCloseAutoFocus && props.onCloseAutoFocus(event);
          }}
          onEscapeKeyDown={(event) => {
            if (!isDismissible) {
              event.preventDefault();

              return;
            }

            return props.onEscapeKeyDown && props.onEscapeKeyDown(event);
          }}
          onInteractOutside={(event) => {
            if (!isDismissible) {
              event.preventDefault();

              return;
            }

            return props.onInteractOutside && props.onInteractOutside(event);
          }}
        >
          {children}

          {isDismissible ? (
            <DialogPrimitive.Close className={close()} asChild>
              <Button variant="plainText">
                <Icons.Close />

                <span className="sr-only">Close</span>
              </Button>
            </DialogPrimitive.Close>
          ) : null}
        </DialogPrimitive.Content>
      </Overlay>
    </Portal>
  );
};

const Header = ({ ...props }: ComponentProps<"div">) => {
  return <div className={header()} data-slot="dialog-header" {...props} />;
};

const Footer = ({ ...props }: ComponentProps<"div">) => {
  return <div className={footer()} data-slot="dialog-footer" {...props} />;
};

const Title = ({ ...props }: ComponentProps<typeof DialogPrimitive.Title>) => {
  return <DialogPrimitive.Title className={title()} data-slot="dialog-title" {...props} />;
};

const Description = ({ ...props }: ComponentProps<typeof DialogPrimitive.Description>) => {
  return (
    <DialogPrimitive.Description
      className={description()}
      data-slot="dialog-description"
      {...props}
    />
  );
};

export const Dialog = { Root, Close, Content, Description, Footer, Header, Title, Trigger };
