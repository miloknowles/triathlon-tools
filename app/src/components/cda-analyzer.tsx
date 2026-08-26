"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  Activity,
  Bike,
  FileCheck2,
  Gauge,
  Info,
  LoaderCircle,
  Navigation,
  Trash2,
  TriangleAlert,
  Upload,
  Wind,
} from "lucide-react"
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, XAxis, YAxis } from "recharts"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { RideMap } from "@/components/ride-map"
import { analyzeCda, formatElapsed, type AnalysisSettings, type CdaAnalysis } from "@/lib/cda-analysis"
import { MAX_FIT_BYTES, parseFitFile, type ImportedRide } from "@/lib/fit-import"
import { gpsSamples, nearestGpsSample } from "@/lib/ride-map"

type SettingsForm = Omit<AnalysisSettings, "startSeconds" | "endSeconds"> & {
  startMinutes: number
  endMinutes: number
}

type ChartEventState = { activeTooltipIndex?: number | string | null }

const DEFAULT_SETTINGS: SettingsForm = {
  riderMassKg: 75,
  bikeMassKg: 10,
  drivetrainEfficiency: 0.975,
  airDensityKgM3: 1.2,
  crr: 0.004,
  windowSeconds: 60,
  startMinutes: 0,
  endMinutes: 0,
  maxAbsoluteGrade: 0.012,
}

const chartConfig = {
  power: { label: "Power", theme: { light: "#4f46e5", dark: "#818cf8" } },
  speed: { label: "Speed", theme: { light: "#059669", dark: "#34d399" } },
  altitude: { label: "Elevation", theme: { light: "#d97706", dark: "#fbbf24" } },
} satisfies ChartConfig

function compassDirection(degrees: number) {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
  return directions[Math.round(degrees / 45) % 8]
}

export function CdaAnalyzer() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragStartSecondsRef = useRef<number | null>(null)
  const dragCurrentSecondsRef = useRef<number | null>(null)
  const [ride, setRide] = useState<ImportedRide | null>(null)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [result, setResult] = useState<CdaAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hoveredElapsedSeconds, setHoveredElapsedSeconds] = useState<number | null>(null)
  const [dragSelection, setDragSelection] = useState<{ startSeconds: number; endSeconds: number } | null>(null)

  const chartData = useMemo(() => {
    if (!ride) return []
    const stride = Math.max(1, Math.ceil(ride.samples.length / 700))
    return ride.samples.filter((_, index) => index % stride === 0).map((sample) => ({
      elapsedSeconds: sample.elapsedSeconds,
      minute: sample.elapsedSeconds / 60,
      power: sample.powerWatts,
      speed: sample.speedMps === null ? null : sample.speedMps * 3.6,
      altitude: sample.altitudeMeters,
    }))
  }, [ride])

  const rideGpsSamples = useMemo(() => gpsSamples(ride?.samples ?? []), [ride])
  const hoverSample = useMemo(
    () => hoveredElapsedSeconds === null ? null : nearestGpsSample(rideGpsSamples, hoveredElapsedSeconds),
    [hoveredElapsedSeconds, rideGpsSamples]
  )
  const displayedSelection = dragSelection
    ? {
        startMinutes: Math.min(dragSelection.startSeconds, dragSelection.endSeconds) / 60,
        endMinutes: Math.max(dragSelection.startSeconds, dragSelection.endSeconds) / 60,
      }
    : { startMinutes: settings.startMinutes, endMinutes: settings.endMinutes }

  function chartDatum(state: ChartEventState) {
    if (state.activeTooltipIndex === null || state.activeTooltipIndex === undefined) return undefined
    const index = Number(state.activeTooltipIndex)
    return Number.isInteger(index) ? chartData[index] : undefined
  }

  function updateHoveredPosition(state: ChartEventState) {
    const datum = chartDatum(state)
    setHoveredElapsedSeconds(datum?.elapsedSeconds ?? null)
    if (dragStartSecondsRef.current !== null && datum) {
      dragCurrentSecondsRef.current = datum.elapsedSeconds
      setDragSelection({ startSeconds: dragStartSecondsRef.current, endSeconds: datum.elapsedSeconds })
    }
  }

  function startChartSelection(state: ChartEventState) {
    const datum = chartDatum(state)
    if (!datum) return
    dragStartSecondsRef.current = datum.elapsedSeconds
    dragCurrentSecondsRef.current = datum.elapsedSeconds
    setDragSelection({ startSeconds: datum.elapsedSeconds, endSeconds: datum.elapsedSeconds })
    setHoveredElapsedSeconds(datum.elapsedSeconds)
  }

  function finishChartSelection(state?: ChartEventState) {
    const startSeconds = dragStartSecondsRef.current
    if (startSeconds === null) return
    const endSeconds = (state && chartDatum(state)?.elapsedSeconds) ?? dragCurrentSecondsRef.current ?? startSeconds
    dragStartSecondsRef.current = null
    dragCurrentSecondsRef.current = null
    setDragSelection(null)
    if (endSeconds === startSeconds) return
    setSettings((current) => ({
      ...current,
      startMinutes: Math.min(startSeconds, endSeconds) / 60,
      endMinutes: Math.max(startSeconds, endSeconds) / 60,
    }))
    setResult(null)
  }

  function cancelChartSelection() {
    dragStartSecondsRef.current = null
    dragCurrentSecondsRef.current = null
    setDragSelection(null)
    setHoveredElapsedSeconds(null)
  }

  async function importFile(file: File | undefined) {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const imported = await parseFitFile(file)
      const endMinutes = imported.durationSeconds / 60
      setRide(imported)
      setHoveredElapsedSeconds(null)
      setDragSelection(null)
      setSettings((current) => ({ ...current, startMinutes: 0, endMinutes }))
      setResult(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The FIT file could not be imported.")
    } finally {
      setLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  function runAnalysis() {
    if (!ride) return
    setError(null)
    try {
      const startSeconds = Math.max(0, settings.startMinutes * 60)
      const endSeconds = Math.min(ride.durationSeconds, settings.endMinutes * 60)
      if (endSeconds - startSeconds < settings.windowSeconds * 3) {
        throw new Error("Select a range at least three analysis windows long.")
      }
      setResult(analyzeCda(ride.samples, { ...settings, startSeconds, endSeconds }))
    } catch (caught) {
      setResult(null)
      setError(caught instanceof Error ? caught.message : "The analysis could not be completed.")
    }
  }

  function updateSetting<Key extends keyof SettingsForm>(key: Key, value: number) {
    setSettings((current) => ({ ...current, [key]: value }))
    setResult(null)
  }

  function removeRide() {
    setRide(null)
    setResult(null)
    setError(null)
    setHoveredElapsedSeconds(null)
    cancelChartSelection()
  }

  return (
    <main id="cda-analyzer" className="mx-auto flex w-full max-w-[88rem] flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <section className="max-w-3xl space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Estimate CdA from a bike power file</h1>
        <p className="text-base leading-7 text-muted-foreground">
          Find straight, mostly flat windows in your power file and estimate an effective race-position CdA. Opposite-direction
          windows are used to estimate the wind that best reconciles the data.
        </p>
      </section>

      <Alert>
        <Info />
        <AlertTitle>A field estimate, not a wind-tunnel result</AlertTitle>
        <AlertDescription>
          Crr is held at your chosen assumption. The result can still be shifted by drafting, traffic, changing wind, position changes,
          tire pressure, and barometric elevation error.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs leading-none font-semibold text-primary-foreground tabular-nums">1</span>
            Import your ride
          </CardTitle>
          <CardDescription>
            The FIT file stays in your browser. When a route is shown, OpenFreeMap receives normal tile requests for that geographic area.
          </CardDescription>
          {ride && (
            <CardAction>
              <Button variant="ghost" size="sm" onClick={removeRide}><Trash2 /> Remove</Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          <Input
            ref={fileInputRef}
            id="fit-upload"
            type="file"
            accept=".fit,application/octet-stream"
            className="sr-only"
            aria-label="Import FIT file"
            onChange={(event) => void importFile(event.target.files?.[0])}
          />
          {!ride ? (
            <button
              type="button"
              className="flex min-h-44 w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/30 px-6 text-center transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => { event.preventDefault(); void importFile(event.dataTransfer.files?.[0]) }}
            >
              {loading ? <LoaderCircle className="size-8 animate-spin text-primary" /> : <Upload className="size-8 text-primary" />}
              <span className="font-medium">{loading ? "Reading FIT file…" : "Choose or drop a Wahoo FIT file"}</span>
              <span className="text-sm text-muted-foreground">Up to {MAX_FIT_BYTES / 1024 / 1024} MB</span>
            </button>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="flex items-center gap-3 rounded-lg border p-4 sm:col-span-2">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><FileCheck2 className="size-5" /></span>
                <div className="min-w-0"><p className="truncate font-medium">{ride.filename}</p><p className="text-sm text-muted-foreground">{ride.samples.length.toLocaleString()} records</p></div>
              </div>
              <div className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">Duration</p><p className="mt-1 text-xl font-semibold tabular-nums">{formatElapsed(ride.durationSeconds)}</p></div>
              <div className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">Distance</p><p className="mt-1 text-xl font-semibold tabular-nums">{(ride.distanceMeters / 1000).toFixed(1)} km</p></div>
              <div className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">Average power</p><p className="mt-1 text-xl font-semibold tabular-nums">{Math.round(ride.averagePowerWatts)} W</p></div>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive"><TriangleAlert /><AlertTitle>Analysis unavailable</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
      )}

      {ride && (
        <>
          <Card>
            <CardHeader><CardTitle>Ride overview</CardTitle><CardDescription>Drag across the timeline to select a clean race section, or enter its start and end below.</CardDescription></CardHeader>
            <CardContent>
              <div className={rideGpsSamples.length > 0 ? "grid gap-4 lg:grid-cols-2" : undefined}>
                <div className="min-w-0">
                  <ChartContainer
                    config={chartConfig}
                    className="h-72 w-full cursor-crosshair touch-none select-none"
                    onTouchCancel={cancelChartSelection}
                  >
                    <LineChart
                      data={chartData}
                      margin={{ left: 8, right: 8, top: 8 }}
                      onMouseMove={updateHoveredPosition}
                      onTouchMove={updateHoveredPosition}
                      onMouseDown={startChartSelection}
                      onTouchStart={startChartSelection}
                      onMouseUp={finishChartSelection}
                      onTouchEnd={(state) => {
                        finishChartSelection(state)
                        setHoveredElapsedSeconds(null)
                      }}
                      onMouseLeave={() => {
                        finishChartSelection()
                        setHoveredElapsedSeconds(null)
                      }}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="minute" type="number" domain={["dataMin", "dataMax"]} tickFormatter={(value) => `${Math.round(value)}m`} />
                      <YAxis yAxisId="power" width={42} tickFormatter={(value) => `${value}`} />
                      <YAxis yAxisId="speed" orientation="right" width={42} tickFormatter={(value) => `${value}`} />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            labelFormatter={(_, payload) => {
                              const minute = payload?.[0]?.payload?.minute
                              return Number.isFinite(minute) ? `${Number(minute).toFixed(1)} min` : "Ride timeline"
                            }}
                          />
                        }
                      />
                      <ReferenceArea
                        x1={displayedSelection.startMinutes}
                        x2={displayedSelection.endMinutes}
                        fill="var(--color-power)"
                        fillOpacity={dragSelection ? 0.28 : 0.16}
                        stroke="var(--color-power)"
                        strokeOpacity={0.8}
                        strokeWidth={1.5}
                      />
                      <ReferenceLine x={displayedSelection.startMinutes} stroke="var(--color-power)" strokeWidth={2} />
                      <ReferenceLine x={displayedSelection.endMinutes} stroke="var(--color-power)" strokeWidth={2} />
                      <Line yAxisId="power" dataKey="power" type="monotone" stroke="var(--color-power)" dot={false} strokeWidth={1.2} connectNulls />
                      <Line yAxisId="speed" dataKey="speed" type="monotone" stroke="var(--color-speed)" dot={false} strokeWidth={1.2} connectNulls />
                    </LineChart>
                  </ChartContainer>
                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-indigo-600" /> Power (W)</span>
                    <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-600" /> Speed (km/h)</span>
                    <span>Click and drag to set the analysis range.</span>
                    <span className="font-medium text-foreground tabular-nums">
                      Selected: {formatElapsed(displayedSelection.startMinutes * 60)}–{formatElapsed(displayedSelection.endMinutes * 60)}
                    </span>
                    {rideGpsSamples.length === 0 && <span>GPS headings are missing; wind fitting will be limited.</span>}
                    {!ride.hasAltitude && <span>Altitude is missing; flat-road gravity is assumed.</span>}
                  </div>
                </div>
                {rideGpsSamples.length > 0 && <RideMap samples={ride.samples} hoverSample={hoverSample} />}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.55fr)]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs leading-none font-semibold text-primary-foreground tabular-nums">2</span>
                  Set the analysis assumptions
                </CardTitle>
                <CardDescription>Start with a known flat out-and-back portion and your total race setup.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <TimeField id="start-time" label="Start time" valueSeconds={settings.startMinutes * 60} maxSeconds={ride.durationSeconds} onChange={(value) => updateSetting("startMinutes", value / 60)} />
                <TimeField id="end-time" label="End time" valueSeconds={settings.endMinutes * 60} maxSeconds={ride.durationSeconds} onChange={(value) => updateSetting("endMinutes", value / 60)} />
                <NumberField id="window-seconds" label="Window length" suffix="sec" value={settings.windowSeconds} min={30} max={300} step={15} onChange={(value) => updateSetting("windowSeconds", value)} description="60–120 sec usually works well." />
                <NumberField id="rider-mass" label="Rider mass" suffix="kg" value={settings.riderMassKg} min={35} max={180} step={0.5} onChange={(value) => updateSetting("riderMassKg", value)} />
                <NumberField id="bike-mass" label="Bike + equipment" suffix="kg" value={settings.bikeMassKg} min={5} max={40} step={0.5} onChange={(value) => updateSetting("bikeMassKg", value)} />
                <NumberField id="crr" label="Assumed Crr" value={settings.crr} min={0.0015} max={0.008} step={0.00025} onChange={(value) => updateSetting("crr", value)} description="Typical good pavement: ~0.003–0.005." />
                <NumberField id="air-density" label="Air density" suffix="kg/m³" value={settings.airDensityKgM3} min={0.9} max={1.35} step={0.01} onChange={(value) => updateSetting("airDensityKgM3", value)} />
                <NumberField id="drivetrain" label="Drivetrain efficiency" suffix="%" value={settings.drivetrainEfficiency * 100} min={90} max={100} step={0.5} onChange={(value) => updateSetting("drivetrainEfficiency", value / 100)} />
                <NumberField id="max-grade" label="Maximum average grade" suffix="%" value={settings.maxAbsoluteGrade * 100} min={0.2} max={5} step={0.1} onChange={(value) => updateSetting("maxAbsoluteGrade", value / 100)} description="Windows steeper than this are excluded." />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>What the filter keeps</CardTitle></CardHeader>
              <CardContent className="text-sm leading-6 text-muted-foreground">
                <p>Continuous windows with power above 20 W and speed above 10.8 km/h.</p>
                <p>Straight travel with at least 90% heading coherence, removing turns and switchbacks.</p>
                <p>Windows below the selected average grade, with elevation and acceleration energy accounted for.</p>
                <Button size="lg" className="mt-2 w-full" onClick={runAnalysis}><Gauge /> Estimate CdA</Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {result && (
        <section className="space-y-6" aria-live="polite">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard icon={<Bike />} label="Estimated CdA" value={result.cda.toFixed(3)} detail={`Middle 50%: ${result.cdaLow.toFixed(3)}–${result.cdaHigh.toFixed(3)} m²`} />
            <MetricCard icon={<Wind />} label="Fitted wind" value={`${(result.estimatedWindSpeedMps * 3.6).toFixed(1)} km/h`} detail={`From ${compassDirection(result.estimatedWindFromDegrees)} (${Math.round(result.estimatedWindFromDegrees)}°)`} />
            <MetricCard icon={<Activity />} label="Clean windows" value={`${result.includedWindowCount} / ${result.totalWindowCount}`} detail="After robust outlier filtering" />
            <MetricCard icon={<Navigation />} label="Assumed Crr" value={settings.crr.toFixed(4)} detail="See sensitivity below" />
          </div>

          {result.warnings.map((warning) => (
            <Alert key={warning}><TriangleAlert /><AlertTitle>Use caution</AlertTitle><AlertDescription>{warning}</AlertDescription></Alert>
          ))}

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Crr sensitivity</CardTitle><CardDescription>How the same windows shift when the rolling-resistance assumption changes.</CardDescription></CardHeader>
              <CardContent>
                <div className="overflow-hidden rounded-lg border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50 text-muted-foreground"><tr><th className="px-4 py-2 font-medium">Crr</th><th className="px-4 py-2 font-medium">Estimated CdA</th></tr></thead>
                    <tbody>{result.sensitivity.map((item) => <tr key={item.crr} className="border-t"><td className="px-4 py-2 tabular-nums">{item.crr.toFixed(4)}</td><td className="px-4 py-2 font-medium tabular-nums">{item.cda.toFixed(3)} m²</td></tr>)}</tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Window distribution</CardTitle><CardDescription>Each dot is one retained straight window; faded dots were rejected as outliers.</CardDescription></CardHeader>
              <CardContent>
                <div className="flex h-48 items-end gap-1 overflow-hidden rounded-lg border bg-muted/20 p-4">
                  {result.windows.map((window) => {
                    const height = Math.max(2, Math.min(100, ((window.cda - 0.1) / 0.45) * 100))
                    return <div key={window.index} title={`${formatElapsed(window.startSeconds)} — CdA ${window.cda.toFixed(3)}`} className={`min-w-1 flex-1 rounded-t-sm ${window.included ? "bg-primary" : "bg-muted-foreground/20"}`} style={{ height: `${height}%` }} />
                  })}
                </div>
                <p className="text-xs text-muted-foreground">Vertical scale: 0.10–0.55 m² · hover a bar for its time and value.</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Window details</CardTitle><CardDescription>Compare direction, speed, power, and CdA to spot drafting or position changes.</CardDescription></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="border-b text-muted-foreground"><tr><th className="pb-2 font-medium">Start</th><th className="pb-2 font-medium">Heading</th><th className="pb-2 font-medium">Speed</th><th className="pb-2 font-medium">Power</th><th className="pb-2 font-medium">Grade</th><th className="pb-2 font-medium">CdA</th><th className="pb-2 font-medium">Status</th></tr></thead>
                <tbody>{result.windows.map((window) => <tr key={window.index} className="border-b last:border-0"><td className="py-2 tabular-nums">{formatElapsed(window.startSeconds)}</td><td className="py-2">{Math.round(window.headingDegrees)}°</td><td className="py-2 tabular-nums">{(window.averageSpeedMps * 3.6).toFixed(1)} km/h</td><td className="py-2 tabular-nums">{Math.round(window.averagePowerWatts)} W</td><td className="py-2 tabular-nums">{((window.elevationChangeMeters / window.distanceMeters) * 100).toFixed(2)}%</td><td className="py-2 font-medium tabular-nums">{Number.isFinite(window.cda) ? window.cda.toFixed(3) : "—"}</td><td className="py-2"><span className={window.included ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}>{window.included ? "Included" : "Outlier"}</span></td></tr>)}</tbody>
              </table>
            </CardContent>
          </Card>
        </section>
      )}
    </main>
  )
}

function NumberField({ id, label, suffix, value, min, max, step, description, onChange }: { id: string; label: string; suffix?: string; value: number; min: number; max: number; step: number; description?: string; onChange: (value: number) => void }) {
  const editingRef = useRef(false)
  const [draft, setDraft] = useState(() => Number.isFinite(value) ? String(value) : "")

  useEffect(() => {
    if (!editingRef.current) setDraft(Number.isFinite(value) ? String(value) : "")
  }, [value])

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        <Input
          id={id}
          type="number"
          value={draft}
          min={min}
          max={max}
          step={step}
          className={suffix ? "pr-14" : undefined}
          onFocus={() => { editingRef.current = true }}
          onChange={(event) => {
            const nextDraft = event.target.value
            setDraft(nextDraft)
            if (nextDraft.trim() === "") return
            const parsed = Number(nextDraft)
            if (Number.isFinite(parsed)) onChange(parsed)
          }}
          onBlur={() => {
            editingRef.current = false
            if (draft.trim() === "" || !Number.isFinite(Number(draft))) {
              setDraft(Number.isFinite(value) ? String(value) : "")
              return
            }
            setDraft(String(Number(draft)))
          }}
        />
        {suffix && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">{suffix}</span>}
      </div>
      {description && <FieldDescription>{description}</FieldDescription>}
    </Field>
  )
}

function formatMinuteSecond(totalSeconds: number) {
  const roundedSeconds = Math.max(0, Math.round(totalSeconds))
  const minutes = Math.floor(roundedSeconds / 60)
  const seconds = roundedSeconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

function parseMinuteSecond(value: string) {
  const match = value.trim().match(/^(\d+):([0-5]\d)$/)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

function TimeField({ id, label, valueSeconds, maxSeconds, onChange }: { id: string; label: string; valueSeconds: number; maxSeconds: number; onChange: (value: number) => void }) {
  const editingRef = useRef(false)
  const [draft, setDraft] = useState(() => formatMinuteSecond(valueSeconds))

  useEffect(() => {
    if (!editingRef.current) setDraft(formatMinuteSecond(valueSeconds))
  }, [valueSeconds])

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        <Input
          id={id}
          type="text"
          value={draft}
          placeholder="MM:SS"
          className="pr-16 font-mono tabular-nums"
          onFocus={() => { editingRef.current = true }}
          onChange={(event) => {
            const nextDraft = event.target.value
            setDraft(nextDraft)
            const parsed = parseMinuteSecond(nextDraft)
            if (parsed !== null && parsed <= maxSeconds) onChange(parsed)
          }}
          onBlur={() => {
            editingRef.current = false
            const parsed = parseMinuteSecond(draft)
            if (parsed === null || parsed > maxSeconds) {
              setDraft(formatMinuteSecond(valueSeconds))
              return
            }
            setDraft(formatMinuteSecond(parsed))
          }}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">MM:SS</span>
      </div>
    </Field>
  )
}

function MetricCard({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return (
    <Card size="sm"><CardContent><div className="flex items-center gap-2 text-sm text-muted-foreground"><span className="[&_svg]:size-4">{icon}</span>{label}</div><p className="text-2xl font-semibold tabular-nums">{value}</p><p className="text-xs text-muted-foreground">{detail}</p></CardContent></Card>
  )
}
