import { Card, Metric, Text } from "@tremor/react";

export default function MetricCard(props: { title: string, value: string, units?: string }) {
  return (
    <Card className="max-w-xs mx-auto space-y-1" color="gray">
      <Text>{props.title}</Text>
      <Metric>{props.value}</Metric>
      <Text>{props.units}</Text>
    </Card>
  );
}