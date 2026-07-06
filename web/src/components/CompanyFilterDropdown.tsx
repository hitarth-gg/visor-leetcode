import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { ChevronDown } from "lucide-react";

type Props = {
  allCompanies: string[];
  selectedCompanies: string[];
  setSelectedCompanies: React.Dispatch<React.SetStateAction<string[]>>;
};

export function CompanyFilterDropdown({
  allCompanies,
  selectedCompanies,
  setSelectedCompanies,
}: Props) {
  function toggleCompany(name: string) {
    setSelectedCompanies((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="shadow-none" size="sm">
          Company
          {selectedCompanies.length > 0 && ` (${selectedCompanies.length})`}
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-72 w-48 overflow-y-auto bg-[#101010]" align="start">
        {allCompanies.map((name) => (
          <DropdownMenuCheckboxItem
            key={name}
            checked={selectedCompanies.includes(name)}
            onCheckedChange={() => toggleCompany(name)}
            onSelect={(e) => e.preventDefault()}
          >
            {name}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
