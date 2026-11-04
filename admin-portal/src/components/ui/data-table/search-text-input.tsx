import { useEffect, useState } from "react";

import { Icons } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import type { AvailableRoutesId } from "@/config/router";
import { useDebounce } from "@/hooks/use-debounce";
import { useSearchText } from "@/hooks/use-search";

const SEARCH_DEBOUNCE_MS = 500;

type SearchTextInputProps = {
  path: AvailableRoutesId;
  placeholder?: string;
};

export const SearchTextInput = ({ path, placeholder }: SearchTextInputProps) => {
  const {
    actions: { setPaginatedSearchText },
    searchText,
  } = useSearchText(path);
  const urlText = searchText ?? "";
  const [text, setText] = useState(urlText);
  const debouncedText = useDebounce(text, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    setText(urlText);
  }, [urlText]);

  useEffect(() => {
    if (debouncedText !== urlText) {
      setPaginatedSearchText(debouncedText);
    }
  }, [debouncedText, setPaginatedSearchText, urlText]);

  return (
    <Input
      aria-label={placeholder ?? "Filter"}
      className="max-w-sm"
      left={<Icons.Search />}
      placeholder={placeholder ?? "Filter"}
      value={text}
      onChange={(event) => {
        setText(event.target.value);
      }}
    />
  );
};
