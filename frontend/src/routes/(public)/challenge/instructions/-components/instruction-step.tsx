import type { ComponentPropsWithoutRef, PropsWithChildren } from "react";
import { twMerge } from "tailwind-merge";

const Root = ({ children }: PropsWithChildren) => {
  return (
    <div className="flex size-full justify-around gap-9 duration-300 animate-in fade-in slide-in-from-top-4">
      {children}
    </div>
  );
};

const Header = ({ children }: PropsWithChildren) => {
  return <h3 className="text-2xl font-semibold">{children}</h3>;
};

const Title = ({ children }: PropsWithChildren) => {
  return <h2 className="text-xl font-bold">{children}</h2>;
};

const Content = ({ children }: PropsWithChildren) => {
  return <div className="flex size-full flex-col items-center gap-9">{children}</div>;
};

const Image = ({ className, ...rest }: ComponentPropsWithoutRef<"img">) => {
  return <img className={twMerge("size-fit", className)} {...rest} />;
};

const Icon = ({ children }: PropsWithChildren) => {
  return (
    <div className="flex size-14 items-center justify-center rounded-full bg-muted-secondary text-3xl text-primary">
      {children}
    </div>
  );
};

const Card = ({ children }: PropsWithChildren) => {
  return (
    <div className="flex w-fit flex-col gap-2 rounded-3xl bg-muted p-10 backdrop-blur-sm">
      {children}
    </div>
  );
};

const Footer = ({ children }: PropsWithChildren) => {
  return <p className="text-lg font-light">{children}</p>;
};

export const InstructionStep = {
  Content,
  Header,
  Card,
  Footer,
  Root,
  Image,
  Title,
  Icon,
};
