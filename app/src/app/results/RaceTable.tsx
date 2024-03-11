"use client";

import { Button, Card, MultiSelect, SearchSelect, MultiSelectItem, Badge, SearchSelectItem, TextInput } from "@tremor/react";

import {
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
} from '@tremor/react';
import { ArrowDownIcon, ArrowLeftIcon, ArrowRightIcon, DownloadIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { useState } from "react";
import { Link } from "@radix-ui/themes";


interface RaceData {
  id: string
  name: string
  series: string
  subevents: { id: string, label: string }[]
}


export default function RaceTable({ data }: { data: RaceData[] }) {
  const [series, setSeries] = useState<string | undefined>("IRONMAN");
  
  const [page, setPage] = useState(0);

  const perPage = 15;

  const filtered = data.filter((r: any) => {
    if (series === undefined) return true;
    return r.series === series;
  });

  const maxPage = Math.ceil(filtered.length / perPage);

  const rows = filtered.slice(page*perPage, page*perPage + perPage).map((row) => {
    return (
      <TableRow key={row.id}>
        <TableCell>
          <Link href={`/results/${row.id}`}>{row.name}</Link>
        </TableCell>
        <TableCell>
          {{
            "IRONMAN": "IRONMAN",
            "IRONMAN-70.3": "70.3",
            "5150-Triathlon-Series": "5150",
          }[row.series]}
        </TableCell>
        <TableCell>
          <Badge>{row.subevents.length}</Badge>
        </TableCell>
      </TableRow>
    );
  });

  const nextPage = () => {
    setPage(Math.min(page + 1, maxPage));
  }

  const prevPage = () => {
    setPage(Math.max(page - 1, 0));
  }

  return (
    <Card className="mt-6">
      <div className="flex gap-3 flex-row">
        {/* <MultiSelect className="" placeholder="Search Athlete(s)" icon={MagnifyingGlassIcon}>
          {names}
        </MultiSelect> */}
        {/* <AgeGroupMultiSelect className="max-w-[240px]" selected={ageGroups} onChange={setAgeGroups}/> */}
        <TextInput icon={MagnifyingGlassIcon} placeholder="Search..." />

        <SearchSelect
          className="max-w-[240px]"
          placeholder="Race Series"
          defaultValue="IRONMAN"
          // icon={ArrowDownIcon}
          value={series}
          // @ts-ignore
          onChange={setSeries}
        >
          <SearchSelectItem value="IRONMAN">IRONMAN</SearchSelectItem>
          <SearchSelectItem value="IRONMAN-70.3">70.3</SearchSelectItem>
          <SearchSelectItem value="5150-Triathlon-Series">5150</SearchSelectItem>
        </SearchSelect>
      </div>
      <Table className="mt-3">
        <TableHead>
          <TableRow>
            <TableHeaderCell className="max-w-[200px]">Name</TableHeaderCell>
            <TableHeaderCell>Series</TableHeaderCell>
            <TableHeaderCell>Result Years</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows}
        </TableBody>
      </Table>
      <div className="flex justify-end mt-3 gap-3">
        <Button variant="secondary" icon={ArrowLeftIcon} onClick={prevPage} disabled={page === 0}>Previous</Button>
        <Button icon={ArrowRightIcon} iconPosition="right" onClick={nextPage} disabled={page >= (maxPage - 1)}>Next</Button>
      </div>
    </Card>
  );
}
