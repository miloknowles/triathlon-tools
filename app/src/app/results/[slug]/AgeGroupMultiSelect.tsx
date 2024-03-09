import { MultiSelect, MultiSelectItem } from "@tremor/react";
import { AGE_GROUPS } from "./types";


interface AgeGroupMultiSelectProps {
  className?: string;
}


export default function AgeGroupMultiSelect(
  { className }: AgeGroupMultiSelectProps
) {
  const items = AGE_GROUPS.map((ageGroup) => (
      <MultiSelectItem key={ageGroup.value} value={ageGroup.value}>
        {ageGroup.label}
      </MultiSelectItem>
    )
  );

  return (
    <MultiSelect className={`${className}`} placeholder="Age Group">
      {items}
    </MultiSelect>
  )
}