import { Skeleton } from "@/app/ui/skeleton";
import { Button } from "@tremor/react";


interface YearSelectProps {
  loading?: boolean;
  className?: string;
  options: string[];
  selected: string | null;
  setSelected: (value: string | null) => void;
}


export default function YearSelect({
  loading, className, options, selected, setSelected
} : YearSelectProps) {
  const btns = options.map((option) => {
    const variant = option === selected ? "primary" : "secondary";
    return (
      <Button
        key={option}
        variant={variant}
        onClick={() => setSelected(option)}
        size="xs"
      >
        {option}
      </Button>
    );
  });

  const skeletons = Array(5).fill(0).map((_, i) => (<Skeleton key={i} className="h-[40px] w-[100px] rounded-full"/>));

  return (
    <div className="flex gap-3 flex-row mt-6 justify-center">
      {
        loading ?
          skeletons :
          btns
      }
    </div>
  )
}