import { Text } from "@radix-ui/themes";
import Link from "next/link";


export default function Footer() {
  return (
    <div className="w-full container flex max-w-screen-2xl justify-center py-3">
      <Link href="https://github.com/miloknowles/triathlon-tools">
        <Text size="1" color="gray" className="">Built with ❤️ by Milo Knowles</Text>
      </Link>
    </div>
  );
}