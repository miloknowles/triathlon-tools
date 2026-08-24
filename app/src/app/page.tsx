import { BikeSimulator } from "@/components/bike-simulator";
import { Navbar } from "@/components/navbar";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <BikeSimulator />
    </div>
  );
}
