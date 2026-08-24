"use client"

import { useMemo, useState } from "react"
import {
  Activity,
  Clock3,
  Download,
  ExternalLink,
  Gauge,
  Info,
  LoaderCircle,
  Mountain,
  Route,
  Trash2,
  TriangleAlert,
  Upload,
} from "lucide-react"
import { Area, AreaChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { courseJson, courseJsonFilename, MAX_GPX_BYTES, parseGpx } from "@/lib/course-import"
import { COURSES } from "@/lib/courses"
import { PRESETS } from "@/lib/presets"
import { loadCourse, simulate, type CourseData, type SimulationResult } from "@/lib/simulator"

type Units = "metric" | "imperial"

type FormValues = {
  courseName: string
  avgPowerWatts: number
  avgCdA: number
  racePositionPercent: number
  avgCrr: number
  lossDrivetrain: number
  massRiderKg: number
  massBikeKg: number
  ambientTempCelsius: number
  relativeHumidity: number
}

const DEFAULTS: FormValues = {
  courseName: "santacruz_703",
  avgPowerWatts: 250,
  avgCdA: 0.28,
  racePositionPercent: 95,
  avgCrr: 0.00375,
  lossDrivetrain: 4.7,
  massRiderKg: 75,
  massBikeKg: 10,
  ambientTempCelsius: 20,
  relativeHumidity: 50,
}

const COURSE_SELECT_ITEMS = COURSES.map((course) => ({
  value: course.value,
  label: `${course.emoji} ${course.label}`,
}))

const CUSTOM_COURSE_VALUE = "__imported_course__"

type ImportedCourse = {
  filename: string
  data: CourseData
}

const chartConfig = {
  altitude: {
    label: "Elevation",
    theme: { light: "#059669", dark: "#34d399" },
  },
  speed: {
    label: "Speed",
    theme: { light: "#4f46e5", dark: "#818cf8" },
  },
  dragWatts: {
    label: "Aerodynamic drag",
    theme: { light: "#2563eb", dark: "#60a5fa" },
  },
  rollingWatts: {
    label: "Rolling resistance",
    theme: { light: "#e11d48", dark: "#fb7185" },
  },
  gravityWatts: {
    label: "Gravity",
    theme: { light: "#d97706", dark: "#fbbf24" },
  },
} satisfies ChartConfig

function formatTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.floor(totalSeconds % 60)
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":")
}

function formatChartTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  return `${hours}:${String(minutes).padStart(2, "0")}`
}

function NumberField({
  id,
  label,
  unit,
  description,
  value,
  step,
  min,
  max,
  onChange,
}: {
  id: string
  label: string
  unit: string
  description?: string
  value: number
  step: number
  min: number
  max: number
  onChange: (value: number) => void
}) {
  return (
    <Field>
      <div className="flex items-center gap-1.5">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        {description ? (
          <Tooltip>
            <TooltipTrigger render={<Button type="button" variant="ghost" size="icon-xs" aria-label={`About ${label}`} />}>
              <Info />
            </TooltipTrigger>
            <TooltipContent className="max-w-72">{description}</TooltipContent>
          </Tooltip>
        ) : null}
        <span className="ml-auto text-xs text-muted-foreground">{unit}</span>
      </div>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        value={Number.isFinite(value) ? value : ""}
        step={step}
        min={min}
        max={max}
        required
        onChange={(event) => onChange(event.target.valueAsNumber)}
      />
    </Field>
  )
}

function PresetButtons({
  items,
  value,
  onChange,
}: {
  items: readonly { label: string; value: number }[]
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <Button
          key={item.label}
          type="button"
          size="xs"
          variant={Math.abs(value - item.value) < 0.00001 ? "secondary" : "outline"}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </Button>
      ))}
    </div>
  )
}

export function BikeSimulator() {
  const [units, setUnits] = useState<Units>("metric")
  const [values, setValues] = useState(DEFAULTS)
  const [results, setResults] = useState<SimulationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importedCourse, setImportedCourse] = useState<ImportedCourse | null>(null)

  const presetCourse = COURSES.find((course) => course.value === values.courseName)
  const selectedCourse = values.courseName === CUSTOM_COURSE_VALUE && importedCourse
    ? { kind: "custom" as const, label: importedCourse.filename, data: importedCourse.data }
    : presetCourse
      ? { kind: "preset" as const, label: presetCourse.label, course: presetCourse }
      : null
  const courseSelectItems = importedCourse
    ? [...COURSE_SELECT_ITEMS, { value: CUSTOM_COURSE_VALUE, label: `Imported: ${importedCourse.filename}` }]
    : COURSE_SELECT_ITEMS

  function update<Key extends keyof FormValues>(key: Key, value: FormValues[Key]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function selectCourse(value: string) {
    update("courseName", value)
    setResults(null)
    setError(null)
  }

  async function importGpx(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    setImportError(null)
    try {
      if (file.size > MAX_GPX_BYTES) throw new Error("GPX files must be 20 MB or smaller.")
      const data = parseGpx(await file.text(), file.size)
      setImportedCourse({ filename: file.name, data })
      setValues((current) => ({ ...current, courseName: CUSTOM_COURSE_VALUE }))
      setResults(null)
      setError(null)
    } catch (caught) {
      setImportError(caught instanceof Error ? caught.message : "The GPX file could not be imported.")
    }
  }

  function removeImportedCourse() {
    setImportedCourse(null)
    setImportError(null)
    setResults(null)
    setError(null)
    setValues((current) => ({
      ...current,
      courseName: current.courseName === CUSTOM_COURSE_VALUE ? DEFAULTS.courseName : current.courseName,
    }))
  }

  function downloadImportedCourse() {
    if (!importedCourse) return
    const blobUrl = URL.createObjectURL(new Blob([courseJson(importedCourse.data)], { type: "application/json" }))
    const link = document.createElement("a")
    link.href = blobUrl
    link.download = courseJsonFilename(importedCourse.filename)
    link.click()
    URL.revokeObjectURL(blobUrl)
  }

  async function runSimulation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedCourse) return

    setLoading(true)
    setError(null)
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

    try {
      const course = selectedCourse.kind === "custom"
        ? selectedCourse.data
        : await loadCourse(selectedCourse.course.url)
      const nextResults = simulate(course, values)
      setResults(nextResults)
      requestAnimationFrame(() => document.querySelector("#results")?.scrollIntoView({ behavior: "smooth", block: "start" }))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The simulation could not be completed.")
    } finally {
      setLoading(false)
    }
  }

  const summary = useMemo(() => {
    if (!results) return null
    const finalState = results.states.at(-1)
    const elapsed = finalState?.t ?? 0
    const avgSpeedMps = elapsed ? results.totalDistanceMeters / elapsed : 0
    return {
      elapsed,
      timeOutOfRacePosition: elapsed * (1 - values.racePositionPercent / 100),
      averageSpeed: avgSpeedMps * (units === "metric" ? 3.6 : 2.23694),
      distance: results.totalDistanceMeters * (units === "metric" ? 0.001 : 0.000621371),
      gain: results.totalGainMeters * (units === "metric" ? 1 : 3.28084),
    }
  }, [results, units, values.racePositionPercent])

  const chartData = useMemo(() => {
    if (!results) return []
    const takeEvery = Math.max(1, Math.ceil(results.states.length / 700))
    return results.states
      .filter((_, index) => index % takeEvery === 0)
      .map((state) => ({
        elapsed: state.t,
        altitude: state.alt * (units === "metric" ? 1 : 3.28084),
        speed: state.v * (units === "metric" ? 3.6 : 2.23694),
        dragWatts: state.dragWatts,
        rollingWatts: state.rollingWatts,
        gravityWatts: state.gravityWatts,
      }))
  }, [results, units])

  const riderMass = units === "metric" ? values.massRiderKg : values.massRiderKg * 2.20462
  const bikeMass = units === "metric" ? values.massBikeKg : values.massBikeKg * 2.20462
  const temperature = units === "metric" ? values.ambientTempCelsius : values.ambientTempCelsius * 1.8 + 32

  return (
    <main id="simulator" className="mx-auto w-full max-w-[88rem] scroll-mt-20 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <section className="mb-8">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Bike Split Predictor</h1>
          <p className="mt-3 text-pretty text-base leading-7 text-muted-foreground">
            The simulator applies your target power to the course elevation profile and models aerodynamic drag,
            rolling resistance, gravity, drivetrain loss, and air density at each step.
          </p>
        </div>
      </section>

      <form id="simulation-form" onSubmit={runSimulation}>
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Simulation Inputs</CardTitle>
            <CardDescription>Start with the defaults, then tune the values to match your race setup.</CardDescription>
            <CardAction>
              <Tabs value={units} onValueChange={(value) => setUnits(value as Units)}>
                <TabsList>
                  <TabsTrigger value="metric">Metric</TabsTrigger>
                  <TabsTrigger value="imperial">Imperial</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardAction>
          </CardHeader>
          <CardContent className="divide-y pt-1">
            <section className="grid gap-6 py-7 first:pt-4 lg:grid-cols-[13rem_minmax(0,1fr)]">
              <div>
                <h3 className="mb-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Course & conditions</h3>
                <p className="text-sm text-muted-foreground">Choose a profile and set the race-day weather.</p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                <Field>
                  <FieldLabel htmlFor="course">Race course</FieldLabel>
                  <Combobox
                    items={courseSelectItems}
                    itemToStringValue={(course) => course.label}
                    value={courseSelectItems.find((course) => course.value === values.courseName) ?? null}
                    onValueChange={(course) => {
                      if (course) selectCourse(course.value)
                    }}
                    autoHighlight
                  >
                    <ComboboxInput id="course" className="w-full" placeholder="Search courses..." />
                    <ComboboxContent>
                      <ComboboxEmpty>No courses found.</ComboboxEmpty>
                      <ComboboxList>
                        {(course) => (
                          <ComboboxItem key={course.value} value={course}>
                            {course.label}
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                  {selectedCourse?.kind === "preset" ? (
                    <FieldDescription>
                      <a href={selectedCourse.course.origin} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1">
                        View source route <ExternalLink className="size-3" />
                      </a>
                    </FieldDescription>
                  ) : null}
                </Field>
                <Field>
                  <FieldLabel htmlFor="gpx-file">Import GPX</FieldLabel>
                  <Input
                    id="gpx-file"
                    type="file"
                    accept=".gpx,application/gpx+xml,application/xml,text/xml"
                    onChange={importGpx}
                  />
                  <FieldDescription>Processed locally—your file isn’t uploaded.</FieldDescription>
                </Field>
                <NumberField id="temperature" label="Temperature" unit={units === "metric" ? "°C" : "°F"} description="Warmer air is less dense and creates slightly less aerodynamic drag." value={temperature} step={1} min={units === "metric" ? -18 : 0} max={units === "metric" ? 45 : 113} onChange={(value) => update("ambientTempCelsius", units === "metric" ? value : (value - 32) / 1.8)} />
                <NumberField id="humidity" label="Relative humidity" unit="%" description="Humid air is slightly less dense than dry air at the same temperature." value={values.relativeHumidity} step={5} min={0} max={100} onChange={(value) => update("relativeHumidity", value)} />
                {importError ? (
                  <Alert variant="destructive" aria-live="polite" className="sm:col-span-2 xl:col-span-4">
                    <TriangleAlert />
                    <AlertTitle>Import failed</AlertTitle>
                    <AlertDescription>{importError}</AlertDescription>
                  </Alert>
                ) : null}
                {importedCourse ? (
                  <Alert className="sm:col-span-2 xl:col-span-4">
                    <Upload />
                    <AlertTitle>{importedCourse.filename}</AlertTitle>
                    <AlertDescription>
                      {(importedCourse.data.meta.totalDistanceMeters / 1000).toFixed(1)} km · {Math.round(importedCourse.data.meta.totalGainMeters).toLocaleString()} m gain · {importedCourse.data.data.length.toLocaleString()} points
                      <span className="mt-3 flex flex-wrap gap-2">
                        <Button type="button" size="xs" variant="outline" onClick={downloadImportedCourse}>
                          <Download /> Download course JSON
                        </Button>
                        <Button type="button" size="xs" variant="ghost" onClick={removeImportedCourse}>
                          <Trash2 /> Remove
                        </Button>
                      </span>
                    </AlertDescription>
                  </Alert>
                ) : null}
              </div>
            </section>

            <section className="grid gap-6 py-7 lg:grid-cols-[13rem_minmax(0,1fr)]">
              <div>
                <h3 className="mb-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Rider & bike</h3>
                <p className="text-sm text-muted-foreground">Your planned output and system mass.</p>
              </div>
              <div className="grid gap-5 sm:grid-cols-3">
                <NumberField id="power" label="Race power" unit="W" value={values.avgPowerWatts} step={5} min={50} max={1000} onChange={(value) => update("avgPowerWatts", value)} />
                <NumberField id="rider-mass" label="Rider mass" unit={units === "metric" ? "kg" : "lb"} value={riderMass} step={1} min={units === "metric" ? 10 : 22} max={units === "metric" ? 200 : 440} onChange={(value) => update("massRiderKg", units === "metric" ? value : value / 2.20462)} />
                <NumberField id="bike-mass" label="Bike mass" unit={units === "metric" ? "kg" : "lb"} value={bikeMass} step={1} min={units === "metric" ? 1 : 2.2} max={units === "metric" ? 30 : 66} onChange={(value) => update("massBikeKg", units === "metric" ? value : value / 2.20462)} />
              </div>
            </section>

            <section className="grid gap-6 py-7 lg:grid-cols-[13rem_minmax(0,1fr)]">
              <div>
                <h3 className="mb-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Equipment</h3>
                <p className="text-sm text-muted-foreground">Tune the losses from tires, position, and drivetrain.</p>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                <FieldGroup className="gap-3">
                  <NumberField id="cda" label="Aerodynamic drag" unit="CdA m²" description="Lower values represent a more aerodynamic rider and bike." value={values.avgCdA} step={0.005} min={0.1} max={0.5} onChange={(value) => update("avgCdA", value)} />
                  <PresetButtons items={PRESETS.cda} value={values.avgCdA} onChange={(value) => update("avgCdA", value)} />
                </FieldGroup>
                <FieldGroup className="gap-3">
                  <NumberField id="race-position" label="Time in race position" unit="%" description="Share of the ride spent in the aerodynamic position represented by your CdA. Time spent sitting up is modeled with 25% higher CdA." value={values.racePositionPercent} step={1} min={0} max={100} onChange={(value) => update("racePositionPercent", value)} />
                  <PresetButtons items={PRESETS.racePosition} value={values.racePositionPercent} onChange={(value) => update("racePositionPercent", value)} />
                </FieldGroup>
                <FieldGroup className="gap-3">
                  <NumberField id="crr" label="Rolling resistance" unit="Crr" description="This combines tire, pressure, and road-surface losses." value={values.avgCrr} step={0.00005} min={0.001} max={0.01} onChange={(value) => update("avgCrr", value)} />
                  <PresetButtons items={PRESETS.crr} value={values.avgCrr} onChange={(value) => update("avgCrr", value)} />
                </FieldGroup>
                <FieldGroup className="gap-3">
                  <NumberField id="drivetrain" label="Drivetrain loss" unit="%" value={values.lossDrivetrain} step={0.1} min={0.1} max={15} onChange={(value) => update("lossDrivetrain", value)} />
                  <PresetButtons items={PRESETS.drivetrain} value={values.lossDrivetrain} onChange={(value) => update("lossDrivetrain", value)} />
                </FieldGroup>
              </div>
            </section>
          </CardContent>
        </Card>

        {error ? (
          <Alert variant="destructive" className="mt-4">
            <TriangleAlert />
            <AlertTitle>Simulation failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

      </form>

      <section id="results" className="scroll-mt-20 pt-14">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Results</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {summary ? `Predicted performance for ${selectedCourse?.label ?? "your course"}.` : "Run the simulator to see your predicted split."}
            </p>
          </div>
          <Button form="simulation-form" type="submit" size="lg" disabled={loading || !selectedCourse}>
            {loading ? <LoaderCircle className="animate-spin" /> : <Activity />}
            {loading ? "Simulating…" : "Run simulation"}
          </Button>
        </div>

        {summary && results ? (
          <>
            {results.overrideCount > 0 ? (
              <Alert className="mb-5">
                <Mountain />
                <AlertTitle>Minimum climbing speed applied</AlertTitle>
                <AlertDescription>
                  The model raised power briefly on steep sections to keep the bike moving.
                </AlertDescription>
              </Alert>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {[
                { label: "Predicted split", value: formatTime(summary.elapsed), unit: "elapsed", icon: Clock3 },
                { label: "Time out of race position", value: formatTime(summary.timeOutOfRacePosition), unit: "elapsed", icon: Clock3 },
                { label: "Average speed", value: summary.averageSpeed.toFixed(1), unit: units === "metric" ? "km/h" : "mph", icon: Gauge },
                { label: "Distance", value: summary.distance.toFixed(1), unit: units === "metric" ? "km" : "mi", icon: Route },
                { label: "Elevation gain", value: Math.round(summary.gain).toLocaleString(), unit: units === "metric" ? "m" : "ft", icon: Mountain },
              ].map((metric) => (
                <Card key={metric.label} size="sm">
                  <CardHeader>
                    <CardDescription className="flex items-center gap-2"><metric.icon className="size-4" /> {metric.label}</CardDescription>
                    <CardTitle className="text-2xl tabular-nums">{metric.value}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">{metric.unit}</CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-4 grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Course profile</CardTitle>
                  <CardDescription>Elevation over elapsed time ({units === "metric" ? "m" : "ft"})</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-72 w-full aspect-auto">
                    <AreaChart data={chartData} accessibilityLayer>
                      <defs>
                        <linearGradient id="altitude-fill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-altitude)" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="var(--color-altitude)" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="elapsed" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => formatChartTime(Number(value))} />
                      <YAxis tickLine={false} axisLine={false} width={42} />
                      <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, payload) => {
                        const elapsed = Number(payload?.[0]?.payload?.elapsed)
                        return Number.isFinite(elapsed) ? formatTime(elapsed) : ""
                      }} />} />
                      <Area dataKey="altitude" type="monotone" fill="url(#altitude-fill)" stroke="var(--color-altitude)" />
                    </AreaChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Velocity</CardTitle>
                  <CardDescription>Predicted speed over elapsed time ({units === "metric" ? "km/h" : "mph"})</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-72 w-full aspect-auto">
                    <LineChart data={chartData} accessibilityLayer>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="elapsed" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => formatChartTime(Number(value))} />
                      <YAxis tickLine={false} axisLine={false} width={42} />
                      <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, payload) => {
                        const elapsed = Number(payload?.[0]?.payload?.elapsed)
                        return Number.isFinite(elapsed) ? formatTime(elapsed) : ""
                      }} />} />
                      <Line dataKey="speed" type="monotone" stroke="var(--color-speed)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Power losses</CardTitle>
                  <CardDescription>Aerodynamic, rolling, and gravitational power over elapsed time (W)</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-72 w-full aspect-auto">
                    <LineChart data={chartData} accessibilityLayer>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="elapsed" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => formatChartTime(Number(value))} />
                      <YAxis tickLine={false} axisLine={false} width={42} />
                      <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, payload) => {
                        const elapsed = Number(payload?.[0]?.payload?.elapsed)
                        return Number.isFinite(elapsed) ? formatTime(elapsed) : ""
                      }} />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Line dataKey="dragWatts" type="monotone" stroke="var(--color-dragWatts)" strokeWidth={2} dot={false} />
                      <Line dataKey="rollingWatts" type="monotone" stroke="var(--color-rollingWatts)" strokeWidth={2} dot={false} />
                      <Line dataKey="gravityWatts" type="monotone" stroke="var(--color-gravityWatts)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <Card className="border-dashed bg-muted/20 py-16">
            <CardContent className="flex flex-col items-center text-center">
              <span className="mb-4 grid size-12 place-items-center rounded-full bg-muted"><Gauge className="size-5 text-muted-foreground" /></span>
              <p className="font-medium">Your prediction will appear here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">Choose a course, adjust your setup, and run the simulation.</p>
            </CardContent>
          </Card>
        )}
      </section>
    </main>
  )
}
