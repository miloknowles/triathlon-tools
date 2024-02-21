import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Code, Heading } from "@radix-ui/themes";


export default function InputLabel(props: { title: string, units: string, description: any }) {
  return (
    <HoverCard>
      <HoverCardTrigger>
      <Heading size="3" style={{borderBottom: "0.5px dashed white"}} className="w-fit">
        {props.title} (<Code>{props.units}</Code>)
      </Heading>
      </HoverCardTrigger>
      <HoverCardContent className="rounded-xl min-w-[400px] text-sm">
        {props.description}
      </HoverCardContent>
    </HoverCard>
  );
}
