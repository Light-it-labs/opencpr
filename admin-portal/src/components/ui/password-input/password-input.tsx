import { type ComponentProps, useState } from "react";

import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";

export const PasswordInput = (props: ComponentProps<typeof Input>) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const togglePasswordVisibility = () => {
    setIsPasswordVisible((prev) => {
      return !prev;
    });
  };

  return (
    <Input
      right={
        <Button
          className="cursor-pointer"
          variant="plainText"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              togglePasswordVisibility();
            }
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            togglePasswordVisibility();
          }}
        >
          {isPasswordVisible ? <Icons.Eye /> : <Icons.EyeOff />}
        </Button>
      }
      type={isPasswordVisible ? "text" : "password"}
      {...props}
    />
  );
};
