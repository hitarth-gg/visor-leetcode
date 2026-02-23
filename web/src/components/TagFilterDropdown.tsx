import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";
import { ChevronDown } from "lucide-react";

type Props = {
  allTags: string[];
  selectedTags: string[];
  setSelectedTags: React.Dispatch<React.SetStateAction<string[]>>;
  tagMatchMode: "AND" | "OR";
  setTagMatchMode: React.Dispatch<React.SetStateAction<"AND" | "OR">>;
};

export function TagFilterDropdown({
  allTags,
  selectedTags,
  setSelectedTags,
  tagMatchMode,
  setTagMatchMode,
}: Props) {
  const [search, setSearch] = React.useState("");

  const filteredTags = React.useMemo(() => {
    return allTags.filter((tag) =>
      tag.toLowerCase().includes(search.toLowerCase()),
    );
  }, [allTags, search]);

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  function clearAll() {
    setSelectedTags([]);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          Tags {selectedTags.length > 0 && `(${selectedTags.length})`}
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-72 p-3 " align="start">
        {/* Mode Toggle */}
        {selectedTags.length > 0 && (
          <>
            <DropdownMenuLabel>Match Mode</DropdownMenuLabel>

            <ToggleGroup
              type="single"
              value={tagMatchMode}
              onValueChange={(value) => {
                if (value) setTagMatchMode(value as "AND" | "OR");
              }}
              className="mb-2"
            >
              <ToggleGroupItem value="AND" className="text-xs">
                AND
              </ToggleGroupItem>
              <ToggleGroupItem value="OR" className="text-xs">
                OR
              </ToggleGroupItem>
            </ToggleGroup>

            <DropdownMenuSeparator />
          </>
        )}

        {/* Search */}
        <Input
          placeholder="Search tags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-2 h-8 text-sm"
        />

        {/* Scrollable Tag List */}
        <ScrollArea className="h-56">
          <div className="flex flex-col">
            {filteredTags.map((tag) => (
              <DropdownMenuCheckboxItem
                key={tag}
                checked={selectedTags.includes(tag)}
                onCheckedChange={() => toggleTag(tag)}
                onSelect={(e) => e.preventDefault()}
              >
                {tag}
              </DropdownMenuCheckboxItem>
            ))}
          </div>
        </ScrollArea>

        {/* Clear */}
        {selectedTags.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <button
              onClick={clearAll}
              className="text-muted-foreground hover:text-primary mt-2 text-xs"
            >
              Clear filters
            </button>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
