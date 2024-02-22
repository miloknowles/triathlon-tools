import { Badge } from "@tremor/react";


export default function InputIndicator(props: {
  value: number,
  choices: { value: number, label: string, color: string }[],
  setValue: (v: number) => void
}) {
  const badges = props.choices.map((c, i) => (
    <Badge
      key={c.value}
      size="sm"
      color={(
        (i === 0 && props.value >= c.value) || // First option
        (i >= (props.choices.length - 1) && props.value <= c.value) || // Last option
        (props.value <= c.value && props.value > props.choices[i + 1].value)
      ) ? c.color : "gray"}
      onClick={() => props.setValue(c.value)}
    >
      {c.label}
    </Badge>
  ));

  return badges;
}
