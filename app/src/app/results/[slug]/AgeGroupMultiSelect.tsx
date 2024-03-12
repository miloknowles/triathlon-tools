import { MultiSelect, MultiSelectItem } from "@tremor/react";
import { AGE_GROUPS } from "./types";


interface AgeGroupMultiSelectProps {
  className?: string;
  selected?: string[]; 
  onChange?: (selected: string[]) => void;
}


export default function AgeGroupMultiSelect(
  { className, selected, onChange }: AgeGroupMultiSelectProps
) {
  const items = AGE_GROUPS.map((ageGroup) => (
      <MultiSelectItem key={ageGroup.value} value={ageGroup.value}>
        {ageGroup.label}
      </MultiSelectItem>
    )
  );

  return (
    <MultiSelect
      className={`${className}`}
      placeholder="Filter by Age Group"
      onValueChange={onChange ? onChange : console.debug}
      value={selected}
    >
      {items}
    </MultiSelect>
  )
}