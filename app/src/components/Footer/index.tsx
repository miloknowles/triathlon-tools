import { Text } from "@radix-ui/themes";
import Link from "next/link";


export default function Footer() {
  return (
    <div className="w-full container flex max-w-screen-2xl items-center justify-between py-5">
      <Text size="1" color="gray"><i>"To give anything less than your best is to sacrifice the gift."</i></Text>
      <Link href="https://github.com/miloknowles/triathlon-tools">
        <Text size="1" color="gray" className="hidden md:block">Built with ❤️ by Milo Knowles</Text>
      </Link>
    </div>
  );
}