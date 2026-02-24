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
import { Badge } from "./ui/badge";

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
        <Button variant="outline" className="shadow-none" size="sm">
          Tags {selectedTags.length > 0 && `(${selectedTags.length})`}
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-72 p-3 bg-[#101010]" align="start">
        {/* Mode Toggle */}
        {selectedTags.length > 0 && (
          <>
            <div className="flex font-geist text-muted-foreground">
              <DropdownMenuLabel>Match Mode:</DropdownMenuLabel>

              <ToggleGroup
                type="single"
                value={tagMatchMode}
                onValueChange={(value) => {
                  if (value) setTagMatchMode(value as "AND" | "OR");
                }}
                className="mb-2"
              >
                <ToggleGroupItem value="AND" size={"sm"} className="text-xs">
                  AND
                </ToggleGroupItem>
                <ToggleGroupItem value="OR" size={"sm"} className="text-xs">
                  OR
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <DropdownMenuSeparator />
          </>
        )}

        {/* Search */}
        <div onKeyDown={(e) => e.stopPropagation()}>
          <Input
            placeholder="Search tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-2 h-8 text-sm"
          />
        </div>

        {/* Scrollable Tag List */}
        <ScrollArea className="h-56 font-geist text-muted-foreground">
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

        {/* Selected Tags */}
        {selectedTags.length > 0 && (
          <>
            <DropdownMenuSeparator className="my-2" />
            
            <div className="flex flex-wrap gap-1">
              {selectedTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={"outline"}
                  onClick={() => toggleTag(tag)}
                  onKeyDown={(e) => e.stopPropagation()}
                  className="text-muted-foreground hover:bg-muted cursor-pointer rounded-full px-2 py-0.5 text-xs"
                >
                  {tag} ×
                </Badge>
              ))}
            </div>
          </>
        )}

        {/* Clear */}
        {selectedTags.length > 0 && (
          <>
            <DropdownMenuSeparator className="mt-2" />
            <button
              onClick={clearAll}
              className="text-muted-foreground hover:text-primary mt-2 cursor-pointer text-xs"
            >
              Clear filters
            </button>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
