import { Flex, Section, Text } from "@radix-ui/themes";
import Link from "next/link";
import { Button } from "../ui/button";


export default function Footer() {
  return (
    <Section size="1" pl="5" pr="5">
      <Flex width="100%" className="justify-between" direction={{initial: "column", sm: "row"}} gap="3">
        <Link href="https://github.com/miloknowles/triathlon-tools">
          <Text size="1" color="gray" className="hidden md:block">Built with 💦 by Milo Knowles</Text>
        </Link>
        <Text size="1" color="gray"><i>"To give anything less than your best is to sacrifice the gift."</i></Text>
        <Link href="mailto:miloknowles97@gmail.com">
          <Button size="sm" className="rounded-xl">Leave feedback</Button>
        </Link>
      </Flex>
    </Section>
  );
}