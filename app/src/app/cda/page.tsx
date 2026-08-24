import { CdaAnalyzer } from "@/components/cda-analyzer"
import { Navbar } from "@/components/navbar"

export default function CdaPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <CdaAnalyzer />
    </div>
  )
}
