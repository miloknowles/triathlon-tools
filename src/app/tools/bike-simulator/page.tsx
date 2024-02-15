import { Metadata } from "next"
import Tool from "./client"

export const metadata: Metadata = {
  title: 'Bike Simulator',
  description: 'Predict your finish time on a bike course using a physics simulator',
}

export default function Page() {
  return (
    <Tool/>
  );
}