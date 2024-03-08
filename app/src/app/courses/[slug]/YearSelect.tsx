import { Button } from "@tremor/react";


interface YearSelectProps {
  className?: string;
  options: string[];
  selected: string;
  setSelected: (value: string) => void;
}


export default function YearSelect({
  className, options, selected, setSelected
} : YearSelectProps) {
  const btns = options.map((option) => {
    const variant = option === selected ? "primary" : "secondary";
    return (
      <Button
        key={option}
        variant={variant}
        onClick={() => setSelected(option)}
      >
        {option}
      </Button>
    );
  });

  return (
    <div className="flex gap-3 flex-row mt-6 justify-center">
      {btns}
    </div>
  )
}