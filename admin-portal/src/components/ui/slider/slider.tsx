import { type ComponentProps } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { tv } from "tailwind-variants";

const sliderVariants = tv({
  slots: {
    root: "relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
    track:
      "relative grow overflow-hidden rounded-full bg-background-default-secondary data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5",
    range:
      "absolute bg-background-brand-default data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full",
    thumb:
      "block size-4 shrink-0 rounded-full border border-border-brand-default bg-white shadow-sm ring-background-brand-default/25 transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden data-disabled:pointer-events-none",
  },
});

const { range, root, thumb, track } = sliderVariants();

const Root = ({ className, ...props }: ComponentProps<typeof SliderPrimitive.Root>) => {
  return <SliderPrimitive.Root className={root({ className })} data-slot="slider" {...props} />;
};

const Track = ({ className, ...props }: ComponentProps<typeof SliderPrimitive.Track>) => {
  return (
    <SliderPrimitive.Track className={track({ className })} data-slot="slider-track" {...props} />
  );
};

const Range = ({ className, ...props }: ComponentProps<typeof SliderPrimitive.Range>) => {
  return (
    <SliderPrimitive.Range className={range({ className })} data-slot="slider-range" {...props} />
  );
};

const Thumb = ({ className, ...props }: ComponentProps<typeof SliderPrimitive.Thumb>) => {
  return (
    <SliderPrimitive.Thumb className={thumb({ className })} data-slot="slider-thumb" {...props} />
  );
};

export const Slider = {
  Root,
  Track,
  Range,
  Thumb,
};
